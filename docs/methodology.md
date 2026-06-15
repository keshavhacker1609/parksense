# Methodology notes

This file is a pointer; the authoritative, runnable definitions live in code.

- **All tunables** (CIS weights, severity/footprint ordinals, H3 resolution,
  peak-hour fraction, confidence `k`, anomaly thresholds, forecast lags/windows,
  the train/test split): [`backend/app/core/config.py`](../backend/app/core/config.py).
- **CIS computation** and component breakdown:
  [`pipeline/features.py`](../pipeline/features.py) → `build_hex_features`.
  The same formula is mirrored in SQL for filter-aware live queries in
  [`backend/app/core/store.py`](../backend/app/core/store.py) → `hexes`.
- **Enforcement Efficiency Gap:** `build_station_features` in `features.py`.
- **Forecast + honest backtest:** [`pipeline/forecast.py`](../pipeline/forecast.py).
- **Correctness tests:** [`backend/tests/`](../backend/tests/).

## Data-quality findings that shaped the design

1. `action_taken_timestamp` and `closed_datetime` are 100% NULL in this
   dataset. The enforcement-response analytics therefore use
   `created → validation_timestamp` latency and validation outcomes, which are
   ~58% populated. No empty lifecycle metric is shown.
2. `violation_type` / `offence_code` are JSON arrays inside single CSV cells and
   are exploded; per-incident severity is the max over its types.
3. Peak hours are derived from the data's own hourly distribution (top quartile
   by volume), not assumed. For this window they are 04, 05, 08–11 local.
4. The CIS recurrence-confidence factor `n/(n+k)` was added after observing that
   severity/footprint/peak alone let single high-severity one-offs rank beside
   chronic hotspots — undesirable for a prioritisation tool.
