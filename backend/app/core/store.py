"""
Data-access layer.

A single in-process DuckDB connection over the materialised Parquet artifacts.
The precomputed hex/station/forecast tables back the unfiltered views; for
*filtered* map queries the CIS is recomputed on the fly in SQL so the score
always reflects exactly the slice the user is looking at. The SQL formula is a
faithful translation of pipeline.features.build_hex_features.
"""
from __future__ import annotations

import json
import threading
from datetime import datetime
from functools import lru_cache

import duckdb

from backend.app.core import config as C


class Store:
    def __init__(self) -> None:
        self.con = duckdb.connect(database=":memory:")
        # FastAPI runs sync endpoints in a threadpool; a single DuckDB
        # connection is not safe for concurrent queries, so serialise access.
        self._lock = threading.Lock()
        self._register_views()
        self.meta = self._load_meta()
        self.peak_hours = self.meta["peak_hours"]
        dr = self.meta["date_range"]
        self.span_days = max(
            1,
            (datetime.fromisoformat(dr["end"]).date()
             - datetime.fromisoformat(dr["start"]).date()).days,
        )

    # -- setup -------------------------------------------------------------- #
    def _register_views(self) -> None:
        c = self.con
        c.execute(f"CREATE VIEW incidents AS "
                  f"SELECT * FROM '{C.PARQUET.as_posix()}'")
        c.execute(f"CREATE VIEW hex AS "
                  f"SELECT * FROM '{C.HEX_FEATURES.as_posix()}'")
        c.execute(f"CREATE VIEW station AS "
                  f"SELECT * FROM '{C.STATION_FEATURES.as_posix()}'")
        if C.FORECAST_TABLE.exists():
            c.execute(f"CREATE VIEW forecast AS "
                      f"SELECT * FROM '{C.FORECAST_TABLE.as_posix()}'")
        if C.ANOMALY_TABLE.exists():
            c.execute(f"CREATE VIEW anomalies AS "
                      f"SELECT * FROM '{C.ANOMALY_TABLE.as_posix()}'")

    def _load_meta(self) -> dict:
        with open(C.META_JSON, encoding="utf-8") as f:
            return json.load(f)

    def _df(self, sql: str, params: list | None = None):
        with self._lock:
            return self.con.execute(sql, params or []).df()

    # -- filter SQL --------------------------------------------------------- #
    def _where(self, *, frm=None, to=None, violation=None, vehicle=None,
               station=None, bbox=None) -> tuple[str, list]:
        clauses, params = [], []
        if frm:
            clauses.append("created_local >= ?::TIMESTAMPTZ")
            params.append(frm)
        if to:
            clauses.append("created_local <= ?::TIMESTAMPTZ")
            params.append(to)
        if vehicle:
            ph = ",".join("?" * len(vehicle))
            clauses.append(f"vehicle_type IN ({ph})")
            params.extend(vehicle)
        if station:
            ph = ",".join("?" * len(station))
            clauses.append(f"police_station IN ({ph})")
            params.extend(station)
        if violation:
            # violation_types is a list column; match if any element is selected
            ph = ",".join("?" * len(violation))
            clauses.append(
                f"len(list_intersect(violation_types, [{ph}])) > 0")
            params.extend(violation)
        if bbox:
            w, s, e, n = bbox
            clauses.append("longitude BETWEEN ? AND ? "
                           "AND latitude BETWEEN ? AND ?")
            params.extend([w, e, s, n])
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        return where, params

    # -- hex CIS (runtime, filter-aware) ------------------------------------ #
    def hexes(self, *, res: int, limit: int, filters: dict) -> list[dict]:
        if res not in C.H3_RESOLUTIONS_ALLOWED:
            res = C.H3_RESOLUTION
        hcol = f"h3_r{res}"
        where, params = self._where(**filters)
        w = C.CIS_WEIGHTS
        wsum = (w.severity + w.footprint + w.density + w.persistence
                + w.peak_pressure)
        peak_list = ",".join(str(h) for h in self.peak_hours)
        sql = f"""
        WITH base AS (
            SELECT {hcol} AS h3,
                   max_severity, footprint, hour, date, vehicle_number,
                   latitude, longitude,
                   CASE WHEN hour IN ({peak_list}) THEN 1 ELSE 0 END AS is_peak
            FROM incidents{where}
        ),
        agg AS (
            SELECT h3,
                   COUNT(*)                  AS incidents,
                   AVG(max_severity)         AS mean_sev,
                   AVG(footprint)            AS mean_foot,
                   COUNT(DISTINCT date)      AS active_days,
                   AVG(is_peak)              AS peak_share,
                   COUNT(DISTINCT vehicle_number) AS distinct_vehicles,
                   AVG(latitude)             AS lat,
                   AVG(longitude)            AS lon
            FROM base GROUP BY h3
        ),
        scaled AS (
            SELECT *,
                   LEAST(mean_sev / {C.SEVERITY_MAX}, 1.0)  AS sev,
                   LEAST(mean_foot / {C.FOOTPRINT_MAX}, 1.0) AS foot,
                   LN(1 + incidents)                         AS ldens,
                   LEAST(active_days::DOUBLE / {self.span_days}, 1.0) AS persistence,
                   LEAST(peak_share, 1.0)                    AS peak,
                   incidents::DOUBLE / (incidents + {C.CIS_CONFIDENCE_K}) AS conf
            FROM agg
        ),
        norm AS (
            SELECT *,
                   (ldens - MIN(ldens) OVER ())
                   / NULLIF(MAX(ldens) OVER () - MIN(ldens) OVER (), 0)
                       AS density
            FROM scaled
        )
        SELECT h3, incidents, distinct_vehicles, active_days,
               lat, lon, round(conf, 3) AS confidence,
               round(({w.severity}*sev + {w.footprint}*foot
                      + {w.density}*COALESCE(density,0) + {w.persistence}*persistence
                      + {w.peak_pressure}*peak) / {wsum} * 100 * conf, 2) AS cis,
               round({w.severity}*sev      / {wsum} * 100 * conf, 2) AS c_severity,
               round({w.footprint}*foot    / {wsum} * 100 * conf, 2) AS c_footprint,
               round({w.density}*COALESCE(density,0) / {wsum} * 100 * conf, 2) AS c_density,
               round({w.persistence}*persistence / {wsum} * 100 * conf, 2) AS c_persistence,
               round({w.peak_pressure}*peak / {wsum} * 100 * conf, 2) AS c_peak
        FROM norm
        ORDER BY cis DESC
        LIMIT {int(limit)}
        """
        return self._df(sql, params).to_dict("records")

    # -- priority list ------------------------------------------------------ #
    def priority(self, limit: int) -> list[dict]:
        # Join top-CIS r9 cells to their dominant station + enforcement gap.
        sql = f"""
        WITH topcells AS (
            SELECT * FROM hex WHERE resolution = {C.H3_RESOLUTION}
            ORDER BY cis DESC LIMIT {int(limit) * 3}
        ),
        cell_station AS (
            SELECT h3_r9 AS h3, police_station,
                   COUNT(*) AS n,
                   ROW_NUMBER() OVER (PARTITION BY h3_r9 ORDER BY COUNT(*) DESC) rn
            FROM incidents GROUP BY h3_r9, police_station
        )
        SELECT t.h3, t.incidents, t.cis,
               t.c_severity, t.c_footprint, t.c_density,
               t.c_persistence, t.c_peak,
               t.lat, t.lon, t.median_validation_latency_h,
               cs.police_station,
               s.gap, s.under_enforced, s.enforcement_score,
               s.validation_rate, s.rejection_rate
        FROM topcells t
        LEFT JOIN cell_station cs ON cs.h3 = t.h3 AND cs.rn = 1
        LEFT JOIN station s ON s.police_station = cs.police_station
        ORDER BY t.cis DESC
        LIMIT {int(limit)}
        """
        return self._df(sql).to_dict("records")

    def stations(self) -> list[dict]:
        return self._df(
            "SELECT * FROM station ORDER BY gap DESC").to_dict("records")

    def anomalies(self) -> list[dict]:
        if not C.ANOMALY_TABLE.exists():
            return []
        return self._df(
            "SELECT * FROM anomalies ORDER BY z_score DESC").to_dict("records")

    def forecast_cell(self, cell: str) -> dict | None:
        if not C.FORECAST_TABLE.exists():
            return None
        df = self._df("SELECT * FROM forecast WHERE h3 = ?", [cell])
        if df.empty:
            return None
        return df.to_dict("records")[0]

    def forecast_backtest(self) -> dict:
        if not C.FORECAST_BACKTEST.exists():
            return {}
        with open(C.FORECAST_BACKTEST, encoding="utf-8") as f:
            return json.load(f)

    def trends(self, group_by: str, filters: dict) -> list[dict]:
        where, params = self._where(**filters)
        gb_map = {
            "hour": "hour",
            "dow": "dow",
            "month": "month",
            "vehicle": "vehicle_type",
            "violation": "UNNEST(violation_types)",
            "station": "police_station",
        }
        if group_by not in gb_map:
            raise ValueError(f"invalid group_by: {group_by}")
        if group_by == "violation":
            sql = (f"SELECT key, COUNT(*) AS count FROM ("
                   f"  SELECT UNNEST(violation_types) AS key FROM incidents{where}"
                   f") t GROUP BY key ORDER BY count DESC")
        else:
            col = gb_map[group_by]
            sql = (f"SELECT {col} AS key, COUNT(*) AS count "
                   f"FROM incidents{where} GROUP BY key ORDER BY key")
        df = self._df(sql, params)
        df = df.dropna(subset=["key"])
        return df.to_dict("records")

    def latency_distribution(self, filters: dict) -> list[dict]:
        where, params = self._where(**filters)
        sql = f"""
        SELECT width_bucket(validation_latency_h, 0, 240, 24) AS bucket,
               COUNT(*) AS count
        FROM incidents{where}
        WHERE validation_latency_h IS NOT NULL
        GROUP BY bucket ORDER BY bucket
        """
        return self._df(sql, params).to_dict("records")

    def incident(self, incident_id: str) -> dict | None:
        df = self._df(
            "SELECT * FROM incidents WHERE id = ?", [incident_id])
        if df.empty:
            return None
        rec = df.to_dict("records")[0]
        for k, v in list(rec.items()):
            if hasattr(v, "isoformat"):
                rec[k] = v.isoformat()
            elif hasattr(v, "tolist"):
                rec[k] = v.tolist()
        return rec


@lru_cache(maxsize=1)
def get_store() -> Store:
    return Store()
