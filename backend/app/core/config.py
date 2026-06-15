"""
Central configuration for ParkSense.

Every tunable parameter the analytics layer uses lives here with a documented
default. Nothing downstream hardcodes a threshold, weight, resolution or window
inline -- they read from this module. Values that are *data-derived* (peak hours,
CIS quantile breaks, distinct filter values, date range) are NOT here; those are
computed at runtime by the pipeline and persisted as artifacts.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from zoneinfo import ZoneInfo

# --------------------------------------------------------------------------- #
# Paths
# --------------------------------------------------------------------------- #
ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "data"
RAW_CSV = DATA_DIR / "violations_raw.csv"
PARQUET = DATA_DIR / "violations.parquet"
HEX_FEATURES = DATA_DIR / "hex_features.parquet"
STATION_FEATURES = DATA_DIR / "station_features.parquet"
META_JSON = DATA_DIR / "meta.json"
FORECAST_MODEL = DATA_DIR / "forecast_lgbm.txt"
FORECAST_BACKTEST = DATA_DIR / "forecast_backtest.json"
FORECAST_TABLE = DATA_DIR / "forecast.parquet"
ANOMALY_TABLE = DATA_DIR / "anomalies.parquet"

# --------------------------------------------------------------------------- #
# Temporal
# --------------------------------------------------------------------------- #
SOURCE_TZ = "UTC"               # source timestamps are +00
LOCAL_TZ = ZoneInfo("Asia/Kolkata")
LOCAL_TZ_NAME = "Asia/Kolkata"

# How many top hourly buckets count as "peak". The actual hours are derived from
# the data's hourly distribution; this only controls how many qualify.
PEAK_HOUR_FRACTION = 0.25       # top quartile of hours by volume = peak windows

# Literal tokens that mean "missing" in this dataset.
NULL_TOKENS = ("NULL", "", "None", "null", "NaN")

# --------------------------------------------------------------------------- #
# Geospatial (Uber H3)
# --------------------------------------------------------------------------- #
H3_RESOLUTION = 9               # ~174 m edge hex; good for street-block impact
H3_RESOLUTIONS_ALLOWED = (8, 9, 10)
# Bengaluru sanity bounds -- rows outside are treated as bad coordinates.
LAT_BOUNDS = (12.6, 13.3)
LON_BOUNDS = (77.3, 77.9)

# --------------------------------------------------------------------------- #
# Congestion Impact Score (CIS) -- component weights (sum need not be 1; the
# composite is renormalised to 0-100 across cells). Documented in README.
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class CISWeights:
    severity: float = 0.35      # how flow-obstructing the violation mix is
    footprint: float = 0.20     # carriageway width consumed by the vehicle mix
    density: float = 0.20       # violations per unit area (recurrence intensity)
    persistence: float = 0.10   # how many distinct days the cell is active
    peak_pressure: float = 0.15 # share of violations in derived peak windows


CIS_WEIGHTS = CISWeights()

# Recurrence-confidence shrinkage. A cell with very few incidents carries weak
# evidence of sustained congestion impact, so its composite is damped by a
# saturating factor  n / (n + k).  With k below, a cell needs ~k incidents to
# reach half weight; high-volume cells are essentially unshrunk. This stops a
# single high-severity one-off from ranking beside a chronic hotspot.
CIS_CONFIDENCE_K = 25

# Ordinal severity of each violation type by how much it obstructs flow.
# Higher = worse. Unknown/unseen types fall back to DEFAULT_SEVERITY.
# This is a *domain* table (expert ordinal), not a data artifact -- it is the
# one place subject-matter judgement is encoded, and it is fully visible here.
# Keys are the exact distinct violation_type values present in the dataset.
# Flow-obstruction ordinal (5 = worst). Non-parking offences that do not
# directly obstruct the carriageway (e.g. defective number plate, no helmet)
# are scored low so they don't inflate a cell's congestion impact.
VIOLATION_SEVERITY: dict[str, int] = {
    "PARKING ON FOOTPATH": 5,
    "PARKING IN A MAIN ROAD": 5,
    "DOUBLE PARKING": 4,
    "PARKING NEAR ROAD CROSSING": 4,
    "PARKING NEAR BUSTOP/SCHOOL/HOSPITAL ETC": 4,
    "PARKING NEAR TRAFFIC LIGHT OR ZEBRA CROSS": 4,
    "PARKING OPPOSITE TO ANOTHER PARKED VEHICLE": 4,
    "OBSTRUCTING DRIVER": 4,
    "AGAINST ONE WAY/NO ENTRY": 3,
    "WRONG PARKING": 3,
    "PARKING OTHER THAN BUS STOP": 3,
    "H T V PROHIBITED": 3,
    "NO PARKING": 2,
    # non-obstructive offences kept low
    "DEFECTIVE NUMBER PLATE": 1,
    "USING BLACK FILM/OTHER MATERIALS": 1,
    "WITHOUT SIDE MIRROR": 1,
    "REFUSE TO GO FOR HIRE": 1,
    "DEMANDING EXCESS FARE": 1,
}
DEFAULT_SEVERITY = 2
SEVERITY_MAX = 5                # used to normalise the severity component

# Approximate carriageway footprint factor by vehicle type (relative units;
# a scooter = 1.0 baseline). Drives the footprint component. Unknown -> default.
# Keys are the exact distinct vehicle_type values in the dataset. Relative
# carriageway footprint, scooter = 1.0 baseline.
VEHICLE_FOOTPRINT: dict[str, float] = {
    "SCOOTER": 1.0,
    "MOPED": 1.0,
    "MOTOR CYCLE": 1.0,
    "PASSENGER AUTO": 1.8,
    "GOODS AUTO": 2.2,
    "TEMPO": 2.6,
    "CAR": 3.0,
    "JEEP": 3.2,
    "VAN": 3.4,
    "MAXI-CAB": 3.6,
    "OTHERS": 3.0,
    "SCHOOL VEHICLE": 4.5,
    "MINI LORRY": 4.5,
    "LGV": 4.5,
    "TRACTOR": 5.0,
    "HGV": 6.0,
    "LORRY/GOODS VEHICLE": 6.0,
    "TANKER": 6.0,
    "PRIVATE BUS": 6.5,
    "TOURIST BUS": 6.5,
    "FACTORY BUS": 6.5,
    "BUS (BMTC/KSRTC)": 6.5,
}
DEFAULT_FOOTPRINT = 2.0
FOOTPRINT_MAX = 6.5             # used to normalise the footprint component

# --------------------------------------------------------------------------- #
# Enforcement Efficiency Gap
# --------------------------------------------------------------------------- #
# A station is "under-enforced relative to impact" when its impact percentile
# materially exceeds its enforcement-performance percentile.
GAP_FLAG_THRESHOLD = 0.20       # percentile gap above this => flagged
# validation_status values that count as a resolved/approved enforcement.
RESOLVED_STATUSES = ("approved",)
REJECTED_STATUSES = ("rejected",)

# --------------------------------------------------------------------------- #
# Anomaly / emerging hotspot detection
# --------------------------------------------------------------------------- #
ANOMALY_RECENT_DAYS = 14        # recent window compared against baseline
ANOMALY_Z_THRESHOLD = 2.5       # rolling z-score above this => watch zone
ANOMALY_MIN_BASELINE_DAYS = 21  # need this much history to judge a cell

# --------------------------------------------------------------------------- #
# Forecasting (LightGBM, daily per-cell intensity)
# --------------------------------------------------------------------------- #
FORECAST_HORIZON_DAYS = 7
FORECAST_LAGS = (1, 2, 3, 7, 14)
FORECAST_ROLL_WINDOWS = (7, 14)
FORECAST_TEST_DAYS = 21         # held-out tail for honest backtest
FORECAST_TOP_CELLS = 400        # model the busiest cells (where it matters)
LGBM_PARAMS: dict = {
    "objective": "tweedie",
    "tweedie_variance_power": 1.2,
    "n_estimators": 400,
    "learning_rate": 0.05,
    "num_leaves": 31,
    "min_child_samples": 20,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "random_state": 42,
    "n_jobs": -1,
    "verbose": -1,
}

# --------------------------------------------------------------------------- #
# API
# --------------------------------------------------------------------------- #
API_TITLE = "ParkSense API"
API_VERSION = "1.0.0"
DEFAULT_HEX_LIMIT = 5000
PRIORITY_DEFAULT_LIMIT = 25
