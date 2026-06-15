"""
Stage 1 -- ingest.

Reads the raw CSV with DuckDB, cleans it, and materialises an incident-level
Parquet table. Handles, robustly:

  * `"NULL"` literal tokens -> real NULLs (across every text field)
  * `violation_type` / `offence_code` JSON arrays inside a cell -> native lists
  * timezone-aware UTC timestamps -> Asia/Kolkata, with derived calendar parts
  * coordinate sanity bounds (drop off-map rows)
  * per-incident H3 cell at the configured resolutions
  * per-incident severity (max over its violation types) and vehicle footprint
  * lifecycle latencies (created -> action_taken -> closed)

Nothing here is hardcoded that could be read from config.
"""
from __future__ import annotations

import json

import duckdb
import h3
import pandas as pd

from backend.app.core import config as C


def _nullif_chain(col: str) -> str:
    """Build a nested NULLIF so every NULL_TOKEN maps to SQL NULL."""
    expr = col
    for tok in C.NULL_TOKENS:
        expr = f"NULLIF({expr}, '{tok}')"
    return expr


def _build_clean_relation(con: duckdb.DuckDBPyConnection):
    cols = [
        "id", "location", "vehicle_number", "vehicle_type", "description",
        "police_station", "junction_name", "center_code", "device_id",
        "created_by_id", "validation_status",
    ]
    cleaned = ",\n            ".join(
        f"{_nullif_chain(f'CAST({c} AS VARCHAR)')} AS {c}" for c in cols
    )
    lo_lat, hi_lat = C.LAT_BOUNDS
    lo_lon, hi_lon = C.LON_BOUNDS
    sql = f"""
        SELECT
            {cleaned},
            TRY_CAST(latitude AS DOUBLE)  AS latitude,
            TRY_CAST(longitude AS DOUBLE) AS longitude,
            -- raw JSON-array cells, kept as text for Python-side parsing
            violation_type AS violation_type_raw,
            offence_code   AS offence_code_raw,
            -- timestamps: parse UTC then shift to local tz
            TRY_CAST(created_datetime AS TIMESTAMPTZ)        AS created_utc,
            TRY_CAST(closed_datetime AS TIMESTAMPTZ)         AS closed_utc,
            TRY_CAST(action_taken_timestamp AS TIMESTAMPTZ)  AS action_utc,
            TRY_CAST(validation_timestamp AS TIMESTAMPTZ)    AS validation_utc
        FROM read_csv_auto('{C.RAW_CSV.as_posix()}', header=true,
                           sample_size=-1, ignore_errors=true)
        WHERE TRY_CAST(latitude AS DOUBLE) BETWEEN {lo_lat} AND {hi_lat}
          AND TRY_CAST(longitude AS DOUBLE) BETWEEN {lo_lon} AND {hi_lon}
          AND TRY_CAST(created_datetime AS TIMESTAMPTZ) IS NOT NULL
    """
    return con.sql(sql)


def _parse_array(cell: object) -> list[str]:
    """Parse a JSON-encoded array cell into a clean list of upper-case strings."""
    if cell is None:
        return []
    s = str(cell).strip()
    if s in C.NULL_TOKENS:
        return []
    try:
        val = json.loads(s)
    except (json.JSONDecodeError, TypeError):
        return [s.upper()]
    if not isinstance(val, list):
        val = [val]
    out = []
    for v in val:
        if v is None:
            continue
        t = str(v).strip().upper()
        if t and t not in C.NULL_TOKENS:
            out.append(t)
    return out


def _severity(types: list[str]) -> int:
    if not types:
        return C.DEFAULT_SEVERITY
    return max(C.VIOLATION_SEVERITY.get(t, C.DEFAULT_SEVERITY) for t in types)


def _footprint(vehicle_type: object) -> float:
    if vehicle_type is None:
        return C.DEFAULT_FOOTPRINT
    return C.VEHICLE_FOOTPRINT.get(str(vehicle_type).strip().upper(),
                                   C.DEFAULT_FOOTPRINT)


def run() -> pd.DataFrame:
    print("[ingest] reading raw CSV via DuckDB ...")
    con = duckdb.connect()
    rel = _build_clean_relation(con)
    df = rel.df()
    print(f"[ingest] {len(df):,} rows passed coordinate/timestamp validation")

    # Local-time conversion (timestamps come back tz-aware in UTC).
    for src, dst in [("created_utc", "created_local"),
                     ("closed_utc", "closed_local"),
                     ("action_utc", "action_local"),
                     ("validation_utc", "validation_local")]:
        df[dst] = pd.to_datetime(df[src], utc=True).dt.tz_convert(C.LOCAL_TZ)

    # Calendar parts from local created time.
    cl = df["created_local"]
    df["date"] = cl.dt.date
    df["hour"] = cl.dt.hour
    df["dow"] = cl.dt.dayofweek          # 0 = Monday
    df["month"] = cl.dt.strftime("%Y-%m")
    df["is_weekend"] = df["dow"] >= 5

    # Explode-friendly parsed arrays + per-incident derived attributes.
    df["violation_types"] = df["violation_type_raw"].map(_parse_array)
    df["offence_codes"] = df["offence_code_raw"].map(_parse_array)
    df["n_violations"] = df["violation_types"].map(len)
    df["max_severity"] = df["violation_types"].map(_severity)
    df["footprint"] = df["vehicle_type"].map(_footprint)

    # H3 indexing at every allowed resolution (h3 v4 API).
    lat = df["latitude"].to_numpy()
    lon = df["longitude"].to_numpy()
    for res in C.H3_RESOLUTIONS_ALLOWED:
        df[f"h3_r{res}"] = [
            h3.latlng_to_cell(la, lo, res) for la, lo in zip(lat, lon)
        ]

    # Enforcement-response latency. NOTE: action_taken_timestamp and
    # closed_datetime are 100% NULL in this dataset, so the only usable
    # lifecycle signal is created -> validation_timestamp.
    df["validation_latency_h"] = (
        (df["validation_local"] - df["created_local"]).dt.total_seconds()
        / 3600.0
    )
    # Guard against negative latencies from clock skew.
    df.loc[df["validation_latency_h"] < 0, "validation_latency_h"] = pd.NA
    df["is_validated"] = df["validation_status"].notna()

    # Persist. Lists are stored natively by pyarrow.
    keep = [
        "id", "latitude", "longitude", "location", "junction_name",
        "vehicle_number", "vehicle_type", "police_station", "center_code",
        "violation_types", "offence_codes", "n_violations",
        "max_severity", "footprint",
        "created_local", "closed_local", "action_local", "validation_local",
        "validation_status",
        "date", "hour", "dow", "month", "is_weekend",
        "validation_latency_h", "is_validated",
        *[f"h3_r{r}" for r in C.H3_RESOLUTIONS_ALLOWED],
    ]
    out = df[keep].copy()
    out.to_parquet(C.PARQUET, index=False)
    print(f"[ingest] wrote {C.PARQUET.relative_to(C.ROOT)} "
          f"({len(out):,} incidents)")
    return out


if __name__ == "__main__":
    run()
