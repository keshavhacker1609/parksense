# ParkSense

**Parking-induced congestion intelligence for traffic-enforcement command centres.**

Most parking-violation tools stop at detection — they plot where tickets were
issued. The violations in this dataset are *already* labelled, so detection is a
solved problem. The open question, and the one enforcement teams actually act
on, is **impact**: which locations are doing the most damage to traffic flow,
and where is enforcement effort failing to match that damage.

ParkSense answers that with three computed instruments, surfaced as a single
prioritised action list:

1. **Congestion Impact Score (CIS)** — a transparent per-cell composite that
   ranks locations by how much they obstruct flow, not just how many tickets
   they generate.
2. **Enforcement Efficiency Gap** — per police station, the divergence between
   congestion impact and enforcement performance. The headline output is the
   set of *high-impact, under-enforced* zones.
3. **Short-horizon hotspot forecast** — a backtested per-cell intensity model
   so teams can pre-position rather than react.

Everything is derived at runtime from the raw record file. There are no
hand-entered hotspots, thresholds, or rankings; every tunable lives in
[`backend/app/core/config.py`](backend/app/core/config.py).

---

## Dataset

A single CSV of Bengaluru parking-violation records.

| Computed property        | Value (from the data, not the filename)            |
| ------------------------ | -------------------------------------------------- |
| Incidents                | 298,450                                            |
| Exploded violations      | 348,455 (rows can carry multiple violation types)  |
| Distinct vehicles        | 231,890 (anonymised but stable → repeat analysis)  |
| Impact cells (H3 res 9)  | 2,534                                              |
| Observed window          | 2023-11-09 → 2024-04-08 (Asia/Kolkata)             |
| Derived peak hours       | 04, 05, 08, 09, 10, 11 (top quartile by volume)    |

Parsing handled robustly in [`pipeline/ingest.py`](pipeline/ingest.py):

- `violation_type` / `offence_code` are **JSON arrays inside a CSV cell** — parsed
  and exploded; severity is taken as the max over a row's violation types.
- The literal token `"NULL"` (and similar) is normalised to a real missing value
  across every field.
- Timestamps are timezone-aware UTC and are converted to **Asia/Kolkata** before
  any temporal analysis.
- Coordinates are bounded to Bengaluru; off-map rows are dropped.
- **Lifecycle note discovered during ingest:** `action_taken_timestamp` and
  `closed_datetime` are 100% NULL in this dataset, so they carry no signal. The
  only usable enforcement-response field is `validation_timestamp`. The
  enforcement model therefore uses **created → validation latency** and
  validation outcomes — not invented fields. Where a metric cannot be computed,
  it is not shown.

---

## Congestion Impact Score (CIS)

CIS is a weighted composite of five components, each normalised to `[0, 1]`,
combined with documented weights, then scaled to `0–100` and damped by a
recurrence-confidence factor. The math is implemented once in
[`pipeline/features.py`](pipeline/features.py) and re-implemented faithfully in
SQL for filter-aware live queries in [`backend/app/core/store.py`](backend/app/core/store.py).

```
CIS_raw(cell) =  w_sev · severity
              +  w_foot · footprint
              +  w_dens · density
              +  w_pers · persistence
              +  w_peak · peak_pressure

CIS(cell)     = (CIS_raw / Σw) · 100 · confidence
confidence    = n / (n + k)          # k = CIS_CONFIDENCE_K (default 25)
```

| Component       | Weight | What it measures                                                        |
| --------------- | ------ | ---------------------------------------------------------------------- |
| `severity`      | 0.35   | Mean flow-obstruction ordinal of the cell's violation mix (footpath / main-road / crossing obstruct far more than a generic no-parking). |
| `footprint`     | 0.20   | Mean carriageway width consumed by the cell's vehicle mix (a bus/LGV ≫ a scooter). |
| `density`       | 0.20   | Incident volume per cell, log-compressed then min-max normalised (heavy tail). |
| `persistence`   | 0.10   | Fraction of the observed window the cell was active (chronic vs one-off). |
| `peak_pressure` | 0.15   | Share of the cell's incidents falling in the data-derived peak hours.   |

**Why the confidence factor?** Severity, footprint and peak pressure can all be
high for a single unlucky incident (e.g. one bus on a footpath at rush hour). A
decision tool must not rank that beside a chronic hotspot, so the composite is
shrunk by `n / (n + k)` — a cell needs roughly `k` incidents to reach half
weight. High-volume cells are essentially unshrunk.

The severity and footprint ordinals are the single place subject-matter
judgement is encoded; both are fully visible in `config.py` and keyed to the
**exact** distinct values present in the data. Every component contribution is
persisted and shown on hover in the UI, so the score is never a black box.

---

## Enforcement Efficiency Gap

Per police station ([`build_station_features`](pipeline/features.py)):

- **Impact** = sum of the CIS of every cell the station is responsible for.
- **Enforcement performance** = mean of two percentile ranks: cases actually
  processed (`validation_rate`) and turnaround speed (low median validation
  latency). Rejection rate is reported but not penalised — a correct dismissal
  is still enforcement work.
- **Gap** = `impact_percentile − performance_percentile`. A station with high
  impact but low performance has a large positive gap and is flagged
  `under_enforced` (threshold in config).

This is the product's sharpest output: *"This zone ranks in the 94th percentile
for congestion impact but only the 27th for enforcement performance."*

---

## Forecasting

A daily per-cell violation-intensity model
([`pipeline/forecast.py`](pipeline/forecast.py)) over the busiest cells, using
LightGBM (Tweedie objective for the count-like, zero-inflated target) on:

- lag features (1, 2, 3, 7, 14 days) and rolling mean/std (7, 14 days),
- calendar features (day-of-week, day-of-month, month, weekend),
- a spatial-neighbour signal (mean of H3 ring-1 neighbours, lagged one day).

**Honest backtest** on a held-out final 21 days (no leakage; the model never
sees the test window during training):

| Metric                              | Value |
| ----------------------------------- | ----- |
| MAE                                 | 3.77  |
| MAE — naïve persistence baseline    | 4.23  |
| Skill vs. naïve                     | +11.0% |
| MAPE                                | 96.8% (inflated by many low-count days; MAE is the honest headline) |

We report the persistence baseline alongside the model precisely so the gain is
not overclaimed.

**Emerging-hotspot detection** ([`build_anomalies`](pipeline/features.py)) flags
cells whose recent-window mean exceeds their own baseline by a rolling z-score
threshold — surfaced as "watch zones".

---

## Architecture

```
CSV ──► ingest.py ──► violations.parquet ──► features.py ──► hex_features.parquet
                                                          ├► station_features.parquet
                                                          ├► anomalies.parquet
                                                          └► meta.json
                                            forecast.py ──► forecast.parquet + backtest.json
                                                                     │
                          DuckDB (in-process, columnar)  ◄───────────┘
                                     │
                          FastAPI (typed REST, OpenAPI)
                                     │
        React + TypeScript ── MapLibre GL + deck.gl (H3HexagonLayer) + ECharts
```

- **Engine:** DuckDB over Parquet — no database server, columnar, instant to run.
  Filter-aware CIS is recomputed in SQL so the score always reflects the exact
  slice on screen; aggregation is always server-side (the browser never receives
  raw rows).
- **Spatial:** Uber H3 hexagonal indexing (resolutions 8/9/10, default 9).
- **Frontend:** a single-purpose command console — full-bleed impact heatmap,
  filter rail, and an insight panel driving the prioritised action list. A
  secondary Analytics view covers temporal and composition patterns.

### API (v1)

| Endpoint                       | Purpose                                            |
| ------------------------------ | -------------------------------------------------- |
| `GET /api/v1/meta`             | Date range, distinct filter values, totals, peak hours, CIS quantile breaks, backtest. |
| `GET /api/v1/hexes`            | H3 cells with filter-aware CIS + component breakdown. |
| `GET /api/v1/hotspots/priority`| Ranked enforcement action list with gap + recommendation. |
| `GET /api/v1/enforcement/gap`  | Per-station impact vs. performance.                |
| `GET /api/v1/forecast`         | Per-cell forecast + backtest error.                |
| `GET /api/v1/anomalies`        | Emerging-hotspot watch zones.                      |
| `GET /api/v1/trends`           | Time series grouped by hour / dow / month / vehicle / violation. |
| `GET /api/v1/enforcement/latency` | Validation-latency distribution.                |
| `GET /api/v1/incident/{id}`    | Single-record drill-down.                          |

Interactive docs at `http://localhost:8011/docs`.

---

## Run it

Prerequisites: Python 3.11+, Node 18+. Place the source CSV at
`data/violations_raw.csv`.

```bash
make setup     # venv + backend deps + frontend deps  (once)
make seed      # CSV → parquet → features → model      (~30s, reproducible)
make dev       # backend on :8011, frontend on :5181
```

Without `make` (e.g. Windows PowerShell):

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r backend\requirements.txt
.venv\Scripts\python -m pipeline.run_all
.venv\Scripts\python -m uvicorn backend.app.main:app --port 8011
# in a second shell:
cd frontend; npm install; npm run dev
```

Open `http://localhost:5181`.

### Tests

```bash
make test
```

Covers the provably-correct core: JSON-array / NULL parsing, severity and
footprint mapping, the scoring helpers, peak-hour derivation, and the
confidence-shrinkage monotonicity.

---

## Repository layout

```
backend/    FastAPI app, DuckDB store, config (all tunables), tests
pipeline/   ingest → features → forecast, one-command orchestrator
frontend/   React + TS command console (MapLibre + deck.gl + ECharts)
data/       raw CSV + generated Parquet/JSON artifacts (gitignored)
docs/       methodology notes
```
