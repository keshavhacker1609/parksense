"""
Stage 3 -- spatio-temporal forecasting.

Daily per-cell violation-intensity forecast with LightGBM on lag, calendar and
spatial-neighbour features. Reports an honest backtested error on a held-out
time tail (last FORECAST_TEST_DAYS days), then refits on all data and emits a
short-horizon forecast for the busiest cells.

Nothing about the split or the windows is hardcoded outside config.
"""
from __future__ import annotations

import json

import duckdb
import h3
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error

from backend.app.core import config as C


def _build_panel(df: pd.DataFrame, cells: list[str]) -> pd.DataFrame:
    """Dense (cell x day) panel of incident counts, zero-filled."""
    sub = df[df["h3_r9"].isin(cells)]
    daily = (sub.groupby(["h3_r9", "date"]).size().rename("y").reset_index())
    daily["date"] = pd.to_datetime(daily["date"])
    full_days = pd.date_range(daily["date"].min(), daily["date"].max(), freq="D")
    idx = pd.MultiIndex.from_product([cells, full_days],
                                     names=["h3_r9", "date"])
    panel = (daily.set_index(["h3_r9", "date"]).reindex(idx, fill_value=0)
             .reset_index())
    return panel


def _add_features(panel: pd.DataFrame, neigh: dict[str, list[str]]) -> pd.DataFrame:
    panel = panel.sort_values(["h3_r9", "date"]).copy()
    g = panel.groupby("h3_r9")["y"]
    for lag in C.FORECAST_LAGS:
        panel[f"lag_{lag}"] = g.shift(lag)
    for win in C.FORECAST_ROLL_WINDOWS:
        panel[f"roll_mean_{win}"] = (
            g.shift(1).rolling(win).mean().reset_index(level=0, drop=True))
        panel[f"roll_std_{win}"] = (
            g.shift(1).rolling(win).std().reset_index(level=0, drop=True))
    # calendar
    panel["dow"] = panel["date"].dt.dayofweek
    panel["dom"] = panel["date"].dt.day
    panel["month"] = panel["date"].dt.month
    panel["is_weekend"] = (panel["dow"] >= 5).astype(int)

    # spatial-neighbour signal: yesterday's mean count among ring-1 neighbours
    pivot = panel.pivot(index="date", columns="h3_r9", values="y").fillna(0)
    cells = list(pivot.columns)
    cellset = set(cells)
    cols = {}
    for c in cells:
        ns = [n for n in neigh.get(c, []) if n in cellset]
        cols[c] = pivot[ns].mean(axis=1) if ns else 0.0
    neigh_mean = pd.DataFrame(cols, index=pivot.index)
    nm = (neigh_mean.shift(1).reset_index()
          .melt(id_vars="date", var_name="h3_r9", value_name="neigh_lag1"))
    panel = panel.merge(nm, on=["date", "h3_r9"], how="left")
    return panel


def _feature_cols(panel: pd.DataFrame) -> list[str]:
    base = [f"lag_{l}" for l in C.FORECAST_LAGS]
    base += [f"roll_mean_{w}" for w in C.FORECAST_ROLL_WINDOWS]
    base += [f"roll_std_{w}" for w in C.FORECAST_ROLL_WINDOWS]
    base += ["dow", "dom", "month", "is_weekend", "neigh_lag1"]
    return base


def run() -> None:
    print("[forecast] loading incidents ...")
    df = duckdb.sql(f"SELECT h3_r9, date FROM '{C.PARQUET.as_posix()}'").df()
    df["date"] = pd.to_datetime(df["date"])

    top_cells = (df["h3_r9"].value_counts()
                 .head(C.FORECAST_TOP_CELLS).index.tolist())
    print(f"[forecast] modelling top {len(top_cells)} cells by volume")

    neigh = {c: list(h3.grid_disk(c, 1)) for c in top_cells}
    panel = _build_panel(df, top_cells)
    panel = _add_features(panel, neigh)
    panel = panel.dropna(subset=_feature_cols(panel))

    feats = _feature_cols(panel)
    max_date = panel["date"].max()
    split = max_date - pd.Timedelta(days=C.FORECAST_TEST_DAYS)
    train = panel[panel["date"] <= split]
    test = panel[panel["date"] > split]
    print(f"[forecast] train {train['date'].min().date()}..{split.date()} "
          f"({len(train):,})  |  test {len(test):,} rows")

    model = lgb.LGBMRegressor(**C.LGBM_PARAMS)
    model.fit(train[feats], train["y"])

    pred = np.clip(model.predict(test[feats]), 0, None)
    mae = mean_absolute_error(test["y"], pred)
    naive = test["lag_1"]                       # persistence baseline
    mae_naive = mean_absolute_error(test["y"], naive)
    denom = test["y"].replace(0, np.nan)
    mape = (np.abs(test["y"] - pred) / denom).dropna().mean() * 100

    backtest = {
        "test_days": C.FORECAST_TEST_DAYS,
        "n_cells": len(top_cells),
        "n_test_rows": int(len(test)),
        "mae": round(float(mae), 4),
        "mae_naive_persistence": round(float(mae_naive), 4),
        "skill_vs_naive": round(float(1 - mae / mae_naive), 4),
        "mape_pct": round(float(mape), 2),
        "split_date": split.date().isoformat(),
    }
    print(f"[forecast] backtest MAE={backtest['mae']} "
          f"(naive {backtest['mae_naive_persistence']}, "
          f"skill {backtest['skill_vs_naive']:+.1%}), "
          f"MAPE={backtest['mape_pct']}%")

    # refit on everything, emit next-day forecast per cell (last known row)
    model_full = lgb.LGBMRegressor(**C.LGBM_PARAMS)
    model_full.fit(panel[feats], panel["y"])
    model_full.booster_.save_model(str(C.FORECAST_MODEL))

    last = panel.sort_values("date").groupby("h3_r9").tail(1)
    fc = np.clip(model_full.predict(last[feats]), 0, None)
    out = pd.DataFrame({
        "h3": last["h3_r9"].values,
        "as_of": last["date"].dt.date.astype(str).values,
        "forecast_next_day": np.round(fc, 2),
        "recent_mean_7d": last["roll_mean_7"].round(2).values,
    }).sort_values("forecast_next_day", ascending=False)
    out.to_parquet(C.FORECAST_TABLE, index=False)

    with open(C.FORECAST_BACKTEST, "w", encoding="utf-8") as f:
        json.dump(backtest, f, indent=2)
    print(f"[forecast] wrote {C.FORECAST_TABLE.relative_to(C.ROOT)} "
          f"and backtest metrics")


if __name__ == "__main__":
    run()
