"""
Stage 2 -- features & scores.

Builds, entirely from the cleaned incident table:

  * meta.json            -- true date range, distinct filter values, totals,
                            data-derived peak hours, CIS quantile breaks
  * hex_features.parquet -- per H3 cell: counts + CIS components + CIS (0-100)
  * station_features.parquet -- per police_station: enforcement efficiency,
                            impact, and the Enforcement Efficiency Gap
  * anomalies.parquet    -- emerging-hotspot watch zones (rolling z-score)

The CIS formula is implemented transparently and the per-component contribution
is persisted so the API/UI can show the breakdown on hover.
"""
from __future__ import annotations

import json

import duckdb
import numpy as np
import pandas as pd

from backend.app.core import config as C


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def _minmax(s: pd.Series) -> pd.Series:
    """Min-max scale a series to 0-1; flat series -> 0."""
    lo, hi = s.min(), s.max()
    if hi <= lo:
        return pd.Series(np.zeros(len(s)), index=s.index)
    return (s - lo) / (hi - lo)


def _peak_hours(df: pd.DataFrame) -> list[int]:
    """Derive peak hours: the top fraction of hours by incident volume."""
    by_hour = df.groupby("hour").size().sort_values(ascending=False)
    k = max(1, round(len(by_hour) * C.PEAK_HOUR_FRACTION))
    return sorted(int(h) for h in by_hour.head(k).index)


# --------------------------------------------------------------------------- #
# meta
# --------------------------------------------------------------------------- #
def build_meta(df: pd.DataFrame, peak_hours: list[int]) -> dict:
    exploded = df.explode("violation_types")
    vt_counts = (exploded["violation_types"].dropna()
                 .value_counts().to_dict())
    veh_counts = df["vehicle_type"].dropna().value_counts().to_dict()
    station_counts = df["police_station"].dropna().value_counts().to_dict()
    status_counts = df["validation_status"].dropna().value_counts().to_dict()

    return {
        "date_range": {
            "start": df["created_local"].min().isoformat(),
            "end": df["created_local"].max().isoformat(),
            "timezone": C.LOCAL_TZ_NAME,
        },
        "totals": {
            "incidents": int(len(df)),
            "violations": int(df["n_violations"].sum()),
            "distinct_vehicles": int(df["vehicle_number"].nunique()),
            "distinct_stations": int(df["police_station"].nunique()),
            "distinct_cells_r9": int(df["h3_r9"].nunique()),
        },
        "peak_hours": peak_hours,
        "h3_resolution_default": C.H3_RESOLUTION,
        "h3_resolutions_allowed": list(C.H3_RESOLUTIONS_ALLOWED),
        "violation_types": [{"name": k, "count": int(v)}
                            for k, v in vt_counts.items()],
        "vehicle_types": [{"name": k, "count": int(v)}
                          for k, v in veh_counts.items()],
        "stations": [{"name": k, "count": int(v)}
                     for k, v in station_counts.items()],
        "validation_statuses": [{"name": k, "count": int(v)}
                                for k, v in status_counts.items()],
        "cis_weights": C.CIS_WEIGHTS.__dict__,
        "severity_table": C.VIOLATION_SEVERITY,
        "footprint_table": C.VEHICLE_FOOTPRINT,
    }


# --------------------------------------------------------------------------- #
# CIS per hex
# --------------------------------------------------------------------------- #
def build_hex_features(df: pd.DataFrame, peak_hours: list[int],
                       res: int) -> pd.DataFrame:
    col = f"h3_r{res}"
    peak_set = set(peak_hours)
    df = df.assign(_is_peak=df["hour"].isin(peak_set))

    g = df.groupby(col)
    feat = pd.DataFrame({
        "incidents": g.size(),
        "violations": g["n_violations"].sum(),
        "mean_severity": g["max_severity"].mean(),
        "mean_footprint": g["footprint"].mean(),
        "active_days": g["date"].nunique(),
        "peak_share": g["_is_peak"].mean(),
        "distinct_vehicles": g["vehicle_number"].nunique(),
        "lat": g["latitude"].mean(),
        "lon": g["longitude"].mean(),
        "approved": g.apply(
            lambda x: (x["validation_status"].isin(C.RESOLVED_STATUSES)).sum(),
            include_groups=False),
        "median_validation_latency_h": g["validation_latency_h"].median(),
    })
    feat.index.name = "h3"

    span_days = max(1, (df["date"].max() - df["date"].min()).days)

    # --- CIS components, each scaled to 0-1 ---------------------------------
    sev = (feat["mean_severity"] / C.SEVERITY_MAX).clip(0, 1)
    foot = (feat["mean_footprint"] / C.FOOTPRINT_MAX).clip(0, 1)
    # density: incidents per cell, log-compressed then min-max (heavy tail)
    density = _minmax(np.log1p(feat["incidents"]))
    # persistence: fraction of the observed span the cell was active
    persistence = (feat["active_days"] / span_days).clip(0, 1)
    peak = feat["peak_share"].clip(0, 1)

    w = C.CIS_WEIGHTS
    raw = (w.severity * sev + w.footprint * foot + w.density * density
           + w.persistence * persistence + w.peak_pressure * peak)
    wsum = (w.severity + w.footprint + w.density + w.persistence
            + w.peak_pressure)
    # recurrence-confidence shrinkage: n / (n + k)
    conf = feat["incidents"] / (feat["incidents"] + C.CIS_CONFIDENCE_K)
    cis = (raw / wsum) * 100.0 * conf

    feat["confidence"] = conf.round(3)
    feat["cis"] = cis.round(2)
    # persist component contributions (weight-normalised & shrunk, 0-100 scale)
    feat["c_severity"] = (w.severity * sev / wsum * 100 * conf).round(2)
    feat["c_footprint"] = (w.footprint * foot / wsum * 100 * conf).round(2)
    feat["c_density"] = (w.density * density / wsum * 100 * conf).round(2)
    feat["c_persistence"] = (w.persistence * persistence / wsum * 100 * conf).round(2)
    feat["c_peak"] = (w.peak_pressure * peak / wsum * 100 * conf).round(2)
    feat["approval_rate"] = (feat["approved"] / feat["incidents"]).round(3)

    feat = feat.reset_index()
    feat["resolution"] = res
    return feat.sort_values("cis", ascending=False)


# --------------------------------------------------------------------------- #
# Enforcement Efficiency Gap per station
# --------------------------------------------------------------------------- #
def build_station_features(df: pd.DataFrame, hex_r9: pd.DataFrame) -> pd.DataFrame:
    g = df.groupby("police_station")
    st = pd.DataFrame({
        "incidents": g.size(),
        "mean_input_severity": g["max_severity"].mean(),
        "median_validation_latency_h": g["validation_latency_h"].median(),
        "validated": g["is_validated"].sum(),
        "approved": g.apply(
            lambda x: x["validation_status"].isin(C.RESOLVED_STATUSES).sum(),
            include_groups=False),
        "rejected": g.apply(
            lambda x: x["validation_status"].isin(C.REJECTED_STATUSES).sum(),
            include_groups=False),
    })
    st.index.name = "police_station"

    # Impact = total CIS-weighted load the station is responsible for. Map each
    # incident's r9 cell CIS in, then sum per station.
    cis_lookup = hex_r9.set_index("h3")["cis"]
    df = df.assign(_cell_cis=df["h3_r9"].map(cis_lookup).fillna(0.0))
    st["impact"] = df.groupby("police_station")["_cell_cis"].sum()

    st["validation_rate"] = (st["validated"] / st["incidents"]).round(3)
    st["approval_rate"] = (st["approved"] / st["incidents"]).round(3)
    st["rejection_rate"] = (st["rejected"] / st["incidents"]).round(3)

    # Enforcement performance score: cases actually processed (validation_rate)
    # + fast turnaround (low validation latency). Both as percentile ranks so
    # units are comparable. Rejection is reported but not penalised -- a correct
    # dismissal is still enforcement work.
    lat = st["median_validation_latency_h"]
    perf_speed = 1.0 - lat.rank(pct=True)          # lower latency => better
    perf_speed = perf_speed.fillna(perf_speed.min())
    perf_coverage = st["validation_rate"].rank(pct=True)
    st["enforcement_score"] = (
        (perf_speed + perf_coverage) / 2.0).round(3)

    impact_pct = st["impact"].rank(pct=True)
    perf_pct = st["enforcement_score"].rank(pct=True)
    # Gap: high impact but low enforcement performance => positive gap.
    st["gap"] = (impact_pct - perf_pct).round(3)
    st["impact_pct"] = impact_pct.round(3)
    st["perf_pct"] = perf_pct.round(3)
    st["under_enforced"] = st["gap"] >= C.GAP_FLAG_THRESHOLD

    return st.reset_index().sort_values("gap", ascending=False)


# --------------------------------------------------------------------------- #
# Emerging-hotspot anomaly detection (rolling z-score per cell)
# --------------------------------------------------------------------------- #
def build_anomalies(df: pd.DataFrame, hex_r9: pd.DataFrame) -> pd.DataFrame:
    daily = (df.groupby(["h3_r9", "date"]).size()
             .rename("n").reset_index())
    daily["date"] = pd.to_datetime(daily["date"])
    max_date = daily["date"].max()
    recent_start = max_date - pd.Timedelta(days=C.ANOMALY_RECENT_DAYS)
    base_start = recent_start - pd.Timedelta(days=C.ANOMALY_MIN_BASELINE_DAYS)

    rows = []
    cis_lookup = hex_r9.set_index("h3")["cis"]
    for cell, grp in daily.groupby("h3_r9"):
        base = grp[(grp["date"] < recent_start) & (grp["date"] >= base_start)]
        if len(base) < 3:
            continue
        recent = grp[grp["date"] >= recent_start]
        if recent.empty:
            continue
        mu, sd = base["n"].mean(), base["n"].std(ddof=0)
        if sd == 0:
            continue
        z = (recent["n"].mean() - mu) / sd
        if z >= C.ANOMALY_Z_THRESHOLD:
            rows.append({
                "h3": cell,
                "z_score": round(float(z), 2),
                "baseline_mean": round(float(mu), 2),
                "recent_mean": round(float(recent["n"].mean()), 2),
                "cis": float(cis_lookup.get(cell, 0.0)),
            })
    out = pd.DataFrame(rows)
    if not out.empty:
        out = out.sort_values("z_score", ascending=False)
    return out


# --------------------------------------------------------------------------- #
def run() -> None:
    print("[features] loading incidents ...")
    df = duckdb.sql(
        f"SELECT * FROM '{C.PARQUET.as_posix()}'").df()
    # date came back as object; normalise to date
    df["date"] = pd.to_datetime(df["date"]).dt.date
    df["created_local"] = pd.to_datetime(df["created_local"], utc=True)

    peak_hours = _peak_hours(df)
    print(f"[features] derived peak hours (top {C.PEAK_HOUR_FRACTION:.0%}): "
          f"{peak_hours}")

    # Hex features at every allowed resolution; r9 drives meta & joins.
    all_hex = []
    hex_by_res: dict[int, pd.DataFrame] = {}
    for res in C.H3_RESOLUTIONS_ALLOWED:
        h = build_hex_features(df, peak_hours, res)
        hex_by_res[res] = h
        all_hex.append(h)
    hex_all = pd.concat(all_hex, ignore_index=True)
    hex_all.to_parquet(C.HEX_FEATURES, index=False)
    print(f"[features] wrote {C.HEX_FEATURES.relative_to(C.ROOT)} "
          f"({len(hex_all):,} cell-rows across "
          f"{len(C.H3_RESOLUTIONS_ALLOWED)} resolutions)")

    hex_r9 = hex_by_res[C.H3_RESOLUTION]
    station = build_station_features(df, hex_r9)
    station.to_parquet(C.STATION_FEATURES, index=False)
    print(f"[features] wrote {C.STATION_FEATURES.relative_to(C.ROOT)} "
          f"({len(station):,} stations, "
          f"{int(station['under_enforced'].sum())} under-enforced)")

    anomalies = build_anomalies(df, hex_r9)
    anomalies.to_parquet(C.ANOMALY_TABLE, index=False)
    print(f"[features] wrote {C.ANOMALY_TABLE.relative_to(C.ROOT)} "
          f"({len(anomalies):,} watch zones)")

    # CIS quantile breaks for the legend (data-derived, not hardcoded).
    q = hex_r9["cis"].quantile([0.5, 0.7, 0.85, 0.95]).round(2).tolist()
    meta = build_meta(df, peak_hours)
    meta["cis_quantile_breaks"] = q
    meta["top_cell_cis"] = float(hex_r9["cis"].max())
    with open(C.META_JSON, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, default=str)
    print(f"[features] wrote {C.META_JSON.relative_to(C.ROOT)}")


if __name__ == "__main__":
    run()
