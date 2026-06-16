# ParkSense — Project Documentation

**Parking-Induced Congestion Intelligence for Traffic-Enforcement Command Centres**

Flipkart Gridlock 2.0 · Theme: *Poor Visibility on Parking-Induced Congestion*

| | |
|---|---|
| **Live application** | https://parksense-e1w1.onrender.com |
| **Source code** | https://github.com/keshavhacker1609/parksense |
| **API documentation** | https://parksense-e1w1.onrender.com/docs |

---

## Table of contents

1. [The team](#1-the-team)
2. [Executive summary — what we made](#2-executive-summary--what-we-made)
3. [The problem and why it matters](#3-the-problem-and-why-it-matters)
4. [Our solution](#4-our-solution)
5. [The dataset](#5-the-dataset)
6. [How it works — the analytics layer](#6-how-it-works--the-analytics-layer)
7. [System architecture](#7-system-architecture)
8. [Technology stack and why we chose it](#8-technology-stack-and-why-we-chose-it)
9. [API reference](#9-api-reference)
10. [The user interface](#10-the-user-interface)
11. [How we built it — engineering process](#11-how-we-built-it--engineering-process)
12. [Running the project](#12-running-the-project)
13. [Testing and quality](#13-testing-and-quality)
14. [Project structure](#14-project-structure)
15. [Design decisions and trade-offs](#15-design-decisions-and-trade-offs)
16. [Limitations and honest caveats](#16-limitations-and-honest-caveats)
17. [Future work](#17-future-work)

---

## 1. The team

ParkSense was designed and built by a four-member team.

| Member | Role |
|---|---|
| **Keshav Singla** | Team lead · backend, analytics engine (CIS, enforcement gap), deployment |
| **Aadya Jain** | Data pipeline · parsing, feature engineering, forecasting model |
| **Purva Jain** | Frontend · map console, deck.gl visualisation, UI/UX |
| **Shravani Singh** | Analytics & validation · methodology, testing, documentation |

The work spans a reproducible data pipeline, a typed analytical API, a machine-learning
forecast, and a production-grade single-page command console — integrated into one
deployable product.

---

## 2. Executive summary — what we made

**ParkSense is a decision tool, not a dashboard.** It converts a raw log of ~298,000
Bengaluru parking-violation records into a **ranked, explainable list of where traffic
enforcement should act first** — and where it is currently failing to act.

The product is built around three computed instruments:

1. **Congestion Impact Score (CIS)** — a transparent per-location score that ranks every
   geographic cell by how much it obstructs traffic flow, weighting *what* the violation
   is (not merely how many).
2. **Enforcement Efficiency Gap** — a per-station measure that exposes **high-impact,
   under-enforced zones** — the single most actionable insight for reallocating patrols.
3. **Short-horizon hotspot forecasting** — a backtested model that predicts each
   hotspot's next-day intensity, plus an emerging-hotspot detector for "watch zones".

These are surfaced through a dark, data-dense command console: a full-bleed impact
heatmap, a filter rail, and an insight panel that delivers the prioritised action list
with an audit-grade breakdown of every score.

**Headline figures (all computed from the data):**

| Metric | Value |
|---|---|
| Incidents analysed | 298,450 |
| Violations (multi-label, exploded) | 348,455 |
| Distinct vehicles tracked | 231,890 |
| H3 impact cells (resolution 9) | 2,534 |
| Police stations profiled | 54 |
| Under-enforced high-impact stations flagged | 18 |
| Emerging-hotspot "watch zones" | 28 |
| Observed window | 9 Nov 2023 → 8 Apr 2024 (Asia/Kolkata) |
| Forecast accuracy | MAE 3.77 vs. naïve 4.23 (**+11% skill**) |

---

## 3. The problem and why it matters

Illegal and careless parking is one of the largest, least-managed contributors to urban
congestion. A single vehicle stopped on a main road, a footpath, or near a junction can
throttle a lane for hours, cascading delays across a corridor.

The Gridlock 2.0 brief frames it precisely: *quantify the impact of parking violations on
traffic flow to enable targeted enforcement.* The key word is **impact**.

**Why most approaches fall short.** The violations in the dataset are already detected and
labelled. Plotting them on a map — what most teams will do — only re-states what is
already known. It produces a wall of dots with no priority, no explanation, and no link
to enforcement effectiveness. A command centre cannot act on 298,000 undifferentiated
points.

**The real, unanswered question** is therefore not *"where are violations?"* but:

> Which locations are doing the most damage to traffic flow, and where is enforcement
> effort failing to match that damage?

ParkSense exists to answer exactly that — turning an opaque log into visible, ranked,
explainable priorities. This directly addresses the chosen theme, *Poor Visibility on
Parking-Induced Congestion*.

---

## 4. Our solution

ParkSense treats the problem as a **prioritisation and resource-allocation** problem, and
solves it with three layers that build on each other:

### 4.1 Measure impact (CIS)
Every location is scored by how much it actually obstructs flow — combining violation
severity, vehicle footprint, density, persistence and peak-hour pressure — rather than by
raw count. This makes a bus blocking a main road outrank a scooter on a quiet lane, which
is how a traffic officer would actually triage.

### 4.2 Expose the enforcement gap
We compare each station's congestion impact against its enforcement performance. The
output is a ranked list of zones that are **high-impact but under-enforced** — precisely
where redeploying patrols yields the most benefit.

### 4.3 Look ahead (forecast + anomalies)
We forecast next-day intensity per hotspot and flag cells whose recent activity is
spiking versus their own baseline, so teams can pre-position rather than react.

All three are delivered as a **prioritised enforcement action list** with a one-click
component breakdown — a tool a control room can use on shift.

---

## 5. The dataset

A single CSV of Bengaluru parking-violation records. The schema and its quirks drove many
of our engineering decisions.

**Columns:** `id, latitude, longitude, location, vehicle_number, vehicle_type,
description, violation_type, offence_code, created_datetime, closed_datetime,
modified_datetime, device_id, created_by_id, center_code, police_station,
data_sent_to_scita, junction_name, action_taken_timestamp, data_sent_to_scita_timestamp,
updated_vehicle_number, updated_vehicle_type, validation_status, validation_timestamp`.

**Parsing challenges we handled robustly** (`pipeline/ingest.py`):

- **JSON arrays inside CSV cells** — `violation_type` and `offence_code` are JSON-encoded
  arrays (e.g. `["WRONG PARKING","PARKING IN A MAIN ROAD"]`). One row can carry several
  violations; we parse and explode them, and take per-incident severity as the maximum
  over its types.
- **Literal `"NULL"` tokens** — present across many fields; normalised to real missing
  values rather than treated as text.
- **Timezone-aware timestamps** — source times are UTC (`+00`); we convert to
  Asia/Kolkata before any temporal analysis.
- **Date range from the data, not the filename** — the true observed window
  (9 Nov 2023 → 8 Apr 2024) is computed from `created_datetime` and used to label the UI.
- **Coordinate sanity bounds** — rows outside Bengaluru are dropped.
- **Stable anonymised `vehicle_number`** — used for repeat-offender and chronic-location
  analysis.

**A critical data-quality finding.** On inspection, `action_taken_timestamp` and
`closed_datetime` are **100% NULL** across the dataset. Rather than fabricate enforcement
metrics, we pivoted the enforcement analytics to the field that *is* populated
(~58% coverage): `validation_status` / `validation_timestamp`. Enforcement latency is
therefore measured as **created → validation**. Where a value genuinely cannot be
computed, we do not display it. This honesty is a deliberate design principle.

---

## 6. How it works — the analytics layer

Every model is reproducible from the raw CSV with one command and is documented in code.

### 6.1 Congestion Impact Score (CIS)

CIS is a transparent weighted composite, computed per H3 cell, normalised to 0–100, and
damped by a recurrence-confidence factor.

```
CIS_raw  = w_sev·severity + w_foot·footprint + w_dens·density
         + w_pers·persistence + w_peak·peak_pressure

CIS      = (CIS_raw / Σw) · 100 · confidence
confidence = n / (n + k)          # n = incidents in cell, k = CIS_CONFIDENCE_K (25)
```

| Component | Weight | Definition |
|---|---|---|
| **Severity** | 0.35 | Mean flow-obstruction ordinal of the cell's violation mix. Footpath / main-road / crossing / bus-stop obstructions score highest; non-obstructive offences (e.g. defective number plate) score lowest. |
| **Vehicle footprint** | 0.20 | Mean carriageway width consumed by the cell's vehicle mix (scooter = 1.0 baseline up to bus = 6.5). |
| **Density** | 0.20 | Incident volume per cell, log-compressed (heavy tail) then min-max normalised. |
| **Persistence** | 0.10 | Fraction of the observed window the cell was active — chronic vs. one-off. |
| **Peak pressure** | 0.15 | Share of the cell's incidents in the **data-derived** peak hours. |

**Data-derived peak hours.** Rather than assuming rush hours, we take the top quartile of
hours by incident volume. For this dataset that is **04, 05, 08, 09, 10, 11** (local) —
which we surface explicitly in the UI.

**Why the confidence factor?** Severity, footprint and peak pressure can all be high for a
single unlucky incident (one bus on a footpath at rush hour). A prioritisation tool must
not rank that beside a chronic hotspot, so the composite is shrunk by `n/(n+k)`: a cell
needs roughly `k` incidents to reach half weight; high-volume cells are essentially
unshrunk. This removed low-evidence one-offs from the top of the ranking.

**Transparency.** Each component's contribution is stored and shown on hover in the UI, so
any score is auditable in one glance — it is never a black box. The same formula is
implemented once in Python (`pipeline/features.py`) and faithfully re-implemented in SQL
(`backend/app/core/store.py`) so that **filtered** map views recompute the score for
exactly the slice on screen.

### 6.2 Enforcement Efficiency Gap

Per police station (`build_station_features`):

- **Impact** = sum of the CIS of every cell the station is responsible for.
- **Enforcement performance** = mean of two percentile ranks — cases processed
  (`validation_rate`) and turnaround speed (low median validation latency). Rejection rate
  is reported but **not** penalised: a correct dismissal is still enforcement work.
- **Gap** = `impact_percentile − performance_percentile`. A large positive gap means high
  impact but low enforcement → flagged `under_enforced`.

This produces the product's sharpest line, e.g. *"HAL Old Airport ranks in the 94th
percentile for congestion impact but only the 27th for enforcement performance."*
18 stations are flagged — a ready-made patrol-reallocation list.

### 6.3 Hotspot forecasting

A daily per-cell intensity model (`pipeline/forecast.py`) over the busiest cells:

- **Model:** LightGBM with a Tweedie objective (suited to the count-like, zero-inflated
  target).
- **Features:** lags (1, 2, 3, 7, 14 days), rolling mean/std (7, 14 days), calendar
  (day-of-week, day-of-month, month, weekend), and a **spatial-neighbour** signal (mean of
  H3 ring-1 neighbours, lagged one day).
- **Honest backtest:** evaluated on a held-out final 21 days; the model never sees the
  test window during training.

| Metric | Value |
|---|---|
| MAE | 3.77 |
| MAE — naïve persistence baseline | 4.23 |
| Skill vs. naïve | **+11.0%** |
| MAPE | 96.8% (inflated by many low-count days; MAE is the honest headline) |

We publish the persistence baseline alongside the model so the gain is provable, not
asserted.

### 6.4 Emerging-hotspot / anomaly detection

`build_anomalies` flags cells whose recent-window mean exceeds their own historical
baseline by a rolling z-score threshold. These become **watch zones** (28 detected) —
locations trending up before they become established hotspots.

---

## 7. System architecture

```
                 ┌──────────────────────────────────────────────────┐
   raw CSV  ──►  │  pipeline/ingest.py                               │
   (298k rows)   │    clean · explode JSON · UTC→IST · H3 index      │
                 │            ▼  violations.parquet                  │
                 │  pipeline/features.py                             │
                 │    CIS · enforcement gap · anomalies · meta       │
                 │            ▼  hex/station/anomaly.parquet, meta    │
                 │  pipeline/forecast.py                             │
                 │    LightGBM · backtest ▼ forecast.parquet         │
                 └───────────────────────┬──────────────────────────┘
                                         │  (precomputed artifacts)
                 ┌───────────────────────▼──────────────────────────┐
                 │  DuckDB (in-process, columnar) over Parquet       │
                 │  FastAPI — typed REST, OpenAPI, server-side agg.   │
                 └───────────────────────┬──────────────────────────┘
                                         │  JSON
                 ┌───────────────────────▼──────────────────────────┐
                 │  React + TypeScript SPA                           │
                 │  MapLibre GL + deck.gl (H3HexagonLayer) · ECharts │
                 └──────────────────────────────────────────────────┘
```

**Two-phase design.** Heavy computation (parsing, scoring, model training) runs **once**
in the offline pipeline and is persisted as Parquet/JSON artifacts. The API then serves
these instantly and recomputes only filter-dependent aggregates on demand. This keeps the
live product fast and the analytics reproducible.

**Single-service deployment.** For the live demo, the built frontend is served by the same
FastAPI process that serves the API — one URL, no CORS, one container. The Docker image
ships the precomputed artifacts, so the deployed service needs no raw CSV.

---

## 8. Technology stack and why we chose it

| Layer | Technology | Why |
|---|---|---|
| Analytical engine | **DuckDB** | Columnar, in-process, zero-setup SQL over Parquet. A judge can run it instantly; no DB server. |
| Geospatial index | **Uber H3** | Hexagonal cells give uniform, distortion-free spatial aggregation — the standard in real mobility products. |
| Backend | **FastAPI + Pydantic** | Typed, async, automatic OpenAPI docs, fast. |
| Forecasting | **LightGBM + scikit-learn** | Strong, fast gradient boosting; Tweedie objective fits the count target. |
| Data processing | **pandas + pyarrow** | Robust parsing and Parquet I/O. |
| Frontend | **React + TypeScript + Vite** | Type-safe, fast dev/build. |
| Mapping | **MapLibre GL + deck.gl** | GPU-accelerated `H3HexagonLayer` for the impact heatmap; free, key-less basemap. |
| Charts | **ECharts** | Restrained, control-room-grade charts (not default chart.js). |
| Data fetching | **TanStack Query** | Caching, loading/error states. |
| Packaging | **Docker** | One-command reproducible deploy; single image hosts UI + API. |
| Hosting | **Render (free tier)** | Docker-native, no credit card, blueprint-driven. |

**No paid APIs are required to run.** Everything works offline from the CSV; the basemap
is a free MapLibre raster style.

---

## 9. API reference

Base URL: `https://parksense-e1w1.onrender.com` · Interactive docs: `/docs`

| Method & path | Purpose |
|---|---|
| `GET /health` | Liveness + total incident count. |
| `GET /api/v1/meta` | Date range, distinct vehicle types / stations / violation types, totals, data-derived peak hours, CIS quantile breaks, forecast backtest. |
| `GET /api/v1/hexes` | H3 cells with **filter-aware** CIS and full component breakdown. Params: `res`, `limit`, `from`, `to`, `violation`, `vehicle`, `station`, `bbox`. |
| `GET /api/v1/hotspots/priority` | Ranked enforcement action list with CIS, dominant station, gap, and recommendation. Param: `limit`. |
| `GET /api/v1/enforcement/gap` | Per-station impact vs. enforcement performance, with `under_enforced` flag. |
| `GET /api/v1/forecast` | Per-cell next-day forecast + backtest error. Param: `cell`. |
| `GET /api/v1/anomalies` | Emerging-hotspot watch zones (rolling z-score). |
| `GET /api/v1/trends` | Time series grouped by `hour` / `dow` / `month` / `vehicle` / `violation`, filterable. |
| `GET /api/v1/enforcement/latency` | Validation-latency distribution (binned). |
| `GET /api/v1/incident/{id}` | Single-record drill-down. |

All aggregation is server-side — the browser never receives raw rows. Filter values are
populated dynamically from `distinct` queries, never hardcoded.

---

## 10. The user interface

A single-purpose **command console**, not a marketing site.

**Command view**
- A full-bleed dark **impact heatmap** (deck.gl `H3HexagonLayer`) with a legend tied to
  real CIS quantiles and a resolution switch (H3 8 / 9 / 10).
- A left **filter rail** — date range, violation type, vehicle type, station — all
  populated from `/meta`, multi-select, instant; every change recomputes the score
  server-side.
- A right **insight panel** — the prioritised enforcement list, the selected cell's CIS
  component breakdown, the next-day forecast, and the "under-enforced high-impact zone"
  callout.
- A top bar with live computed totals and the true data date range.

**Analytics view**
- Hourly violation pressure with the derived peak windows highlighted.
- Day-of-week and monthly trends.
- Violation and vehicle composition.
- Enforcement validation-latency distribution.

**Design language.** Deep neutral slate base, one disciplined amber signal colour, a
perceptually-uniform inferno ramp for impact (colour-blind safe), Inter + IBM Plex Mono
with tabular numerals, designed empty/loading/error states, and only functional
micro-interactions. It is meant to feel like an internal tool a traffic department paid
for. Screenshots are in [`docs/screenshots/`](screenshots).

---

## 11. How we built it — engineering process

We followed a strict execution order so each layer rested on a verified one:

1. **Pipeline first.** Robust CSV parsing (JSON arrays, NULLs, timezones) → Parquet →
   validated schema → distinct/meta queries. We printed computed meta to the console to
   confirm parsing before building anything on top.
2. **Scoring + enforcement gap**, with unit tests on the provably-correct core.
3. **FastAPI endpoints** over DuckDB, with OpenAPI.
4. **Map console** consuming the real endpoints.
5. **Forecasting + anomaly models**, wired into the insight panel with honest error
   reporting.
6. **Polish + deploy** — designed states, legend, reproducibility, Docker, live hosting.

**Principles we held throughout**
- **Zero hardcoding.** Every threshold, weight, resolution, time bucket and ranking is
  derived at runtime or lives in one typed config (`backend/app/core/config.py`).
- **Accuracy over flash.** No invented metrics; every chart traces to a real query.
- **Reproducibility.** The whole pipeline rebuilds from the raw CSV in ~30 seconds.

**Issues we found and fixed during verification** (evidence of real engineering):
- Domain tables (severity/footprint) initially didn't match the dataset's exact category
  strings (e.g. `BUS (BMTC/KSRTC)`); corrected against `distinct` queries.
- A single DuckDB connection caused intermittent 500s under FastAPI's concurrent
  threadpool; fixed with a lock.
- `UNNEST` inside `SELECT … GROUP BY` is rejected by DuckDB; rewritten as a subquery.

---

## 12. Running the project

### Option A — Live demo (no setup)
Open **https://parksense-e1w1.onrender.com**. API docs at `/docs`.
*(Free tier sleeps after 15 min idle; first request may take ~50 s to wake.)*

### Option B — Docker (one command)
```bash
docker build -t parksense .
docker run -p 8000:8000 parksense
# open http://localhost:8000  (UI + API; analytics ship in the image)
```

### Option C — Local development from source
Prerequisites: Python 3.11+, Node 18+. Place the dataset at `data/violations_raw.csv`.
```bash
python -m venv .venv
.venv\Scripts\python -m pip install -r backend\requirements.txt
.venv\Scripts\python -m pipeline.run_all          # build parquet + scores + model (~30s)
.venv\Scripts\python -m uvicorn backend.app.main:app --port 8011   # backend
# second terminal:
cd frontend && npm install && npm run dev          # open http://localhost:5181
```

`make setup`, `make seed`, `make dev` and `make test` wrap these on systems with `make`.

---

## 13. Testing and quality

The provably-correct core is covered by unit tests (`backend/tests/`):
- JSON-array and `"NULL"`-token parsing,
- violation-severity and vehicle-footprint mapping,
- scoring helpers (min-max normalisation),
- data-derived peak-hour selection,
- monotonicity of the confidence-shrinkage factor.

```bash
.venv\Scripts\python -m pytest backend\tests -q     # 11 passed
```

The frontend is fully typed and type-checks clean (`tsc -b`), and builds for production
without errors. The Docker image was built and run locally before deployment to verify the
single-service setup end to end.

---

## 14. Project structure

```
parksense/
├── backend/
│   ├── app/
│   │   ├── api/routes.py        # REST endpoints (v1)
│   │   ├── core/
│   │   │   ├── config.py        # ALL tunables: weights, severity/footprint, thresholds
│   │   │   └── store.py         # DuckDB access; filter-aware CIS in SQL
│   │   └── main.py              # FastAPI app; serves API + built UI
│   ├── tests/                   # parsing + scoring unit tests
│   └── requirements.txt
├── pipeline/
│   ├── ingest.py                # CSV → cleaned Parquet (parsing, tz, H3)
│   ├── features.py              # CIS, enforcement gap, anomalies, meta
│   ├── forecast.py              # LightGBM forecast + backtest
│   └── run_all.py               # one-command orchestrator
├── frontend/
│   └── src/
│       ├── components/          # MapCanvas, FilterRail, InsightPanel, Analytics, …
│       ├── api.ts               # typed API client
│       ├── config.ts            # impact ramp, basemap, view config
│       └── theme.css            # design system
├── data/                        # parquet + meta artifacts (raw CSV gitignored)
├── docs/                        # this documentation, methodology, screenshots, deck
├── Dockerfile                   # multi-stage: build UI, serve UI + API
├── render.yaml                  # one-click Render deploy blueprint
└── README.md
```

---

## 15. Design decisions and trade-offs

- **CIS as a transparent composite, not a learned score.** A black-box model might score
  marginally "better" against some proxy, but a command centre must *trust and explain*
  the priority. We chose an auditable, weighted composite with visible components.
- **Confidence shrinkage over a hard minimum-incident cutoff.** Shrinkage degrades
  low-evidence cells smoothly instead of discarding them, preserving genuinely severe but
  newer locations lower in the ranking.
- **Validation lifecycle instead of the empty action/closed fields.** Forced by the data;
  the alternative (showing 0% everywhere or inventing values) would mislead.
- **Precompute + DuckDB rather than a live OLAP DB.** Zero-setup, instantly runnable by
  judges, and fast enough that filtered CIS recomputes in milliseconds.
- **Single-service deployment.** Simpler, one URL, no CORS — ideal for a demo and for a
  real internal tool.

---

## 16. Limitations and honest caveats

- The `action_taken` / `closed` lifecycle fields are empty in this dataset, so true
  enforcement *closure* latency cannot be measured; we use validation latency as the best
  available proxy.
- The forecast targets the busiest cells (where decisions matter); very low-volume cells
  are not individually modelled. MAPE is high because of many near-zero days — MAE and the
  skill-vs-baseline are the honest measures.
- Severity and footprint ordinals encode domain judgement; they are fully visible in
  `config.py` and easily tuned by a traffic authority.
- The free hosting tier sleeps when idle, adding a one-time cold-start delay.

---

## 17. Future work

- Ingest live feeds for rolling, real-time CIS and same-day forecasts.
- Calibrate severity/footprint weights against measured traffic-speed data per corridor.
- Route-aware impact (network effects of a blockage on connected roads).
- Officer-facing mobile view with turn-by-turn patrol routing over the priority list.
- Closed-loop evaluation: measure congestion change after enforcement is reallocated to
  flagged zones.

---

*ParkSense — from a 298,000-row log to a daily patrol plan.*
