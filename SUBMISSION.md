# ParkSense — HackerEarth submission content

Copy-paste source for the Gridlock 2.0 Round 2 submission form.

---

## Theme
**Parking-Induced Congestion** (select the option matching the problem statement).

## Video URL
Record a 2–3 minute screen capture: open the console, hover a hotspot to show the
CIS breakdown, open the under-enforced callout, switch to Analytics. Upload to
YouTube (Unlisted) and paste the link.

## Demo Link
Paste your deployed URL, or — if running locally for judging — `http://localhost:5181`
(note in Instructions that it runs locally via the steps provided).

## Repository URL
Your GitHub repo URL (see "Push to GitHub" steps in README/below).

## Presentation
Upload a short pitch deck (PDF/PPTX): problem → CIS methodology → enforcement gap
→ forecast backtest → architecture → screenshots.

## Source Code
Upload a zip of the repo **excluding** `.venv/`, `node_modules/`, and `data/*.parquet`.

---

## Instructions to Run  (paste into the rich-text box)

**Stack:** Python 3.11+ (FastAPI · DuckDB · Uber H3 · LightGBM) and React + TypeScript (MapLibre GL · deck.gl · ECharts).

**Prerequisites:** Python 3.11+, Node 18+. Place the dataset CSV at `data/violations_raw.csv`.

**1. Install**
```
python -m venv .venv
.venv\Scripts\python -m pip install -r backend\requirements.txt
cd frontend && npm install && cd ..
```

**2. Build data, scores and the forecast model (one command, ~30s, reproducible)**
```
.venv\Scripts\python -m pipeline.run_all
```

**3. Start the backend API (terminal 1)**
```
.venv\Scripts\python -m uvicorn backend.app.main:app --port 8011
```
API docs: http://localhost:8011/docs

**4. Start the frontend (terminal 2)**
```
cd frontend && npm run dev
```
Open http://localhost:5181

**Tests:** `.venv\Scripts\python -m pytest backend\tests -q`

**What to look at:** the H3 impact heatmap is the primary surface; hover any cell
for the live CIS component breakdown; the right panel shows the prioritised
enforcement action list and the top under-enforced high-impact zone; the
Analytics tab covers temporal and composition patterns. All filters recompute
the score server-side from the raw records — nothing is precomputed by hand.
