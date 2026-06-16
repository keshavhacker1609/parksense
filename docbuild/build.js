const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType, ShadingType,
  TableOfContents, PageBreak, PageNumber, Header, Footer, ExternalHyperlink,
  ImageRun, VerticalAlign,
} = require("docx");

const SHOT = "C:/Users/Kesha/Desktop/gridlock/docs/screenshots/";
const NAVY = "1E2A38", AMBER = "B5731A", INK = "222A31", MUT = "5A6672";
const HEADBG = "1E2A38", ROWBG = "EEF2F5";
const CW = 9360; // content width (US Letter, 1" margins)

// ---- helpers ----
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const P = (t, opts = {}) => new Paragraph({ spacing: { after: 120, line: 276 }, children: textRuns(t), ...opts });
const bullet = (t) => new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 60, line: 264 }, children: textRuns(t) });
const numbered = (t) => new Paragraph({ numbering: { reference: "n", level: 0 }, spacing: { after: 60, line: 264 }, children: textRuns(t) });

// parse **bold** segments in a string into TextRuns
function textRuns(t) {
  if (Array.isArray(t)) return t;
  const parts = String(t).split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((s) =>
    s.startsWith("**") && s.endsWith("**")
      ? new TextRun({ text: s.slice(2, -2), bold: true })
      : new TextRun(s));
}

function cell(content, { header = false, w, bg, align } = {}) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "C2CCD4" };
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    borders: { top: border, bottom: border, left: border, right: border },
    shading: { fill: header ? HEADBG : (bg || "FFFFFF"), type: ShadingType.CLEAR },
    margins: { top: 70, bottom: 70, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: align || AlignmentType.LEFT,
      children: textRuns(content).map((r) => {
        // recolor for header
        if (header) return new TextRun({ text: r.options?.text ?? "", bold: true, color: "FFFFFF", size: 19 });
        return r;
      }),
    })],
  });
}

function table(rows, widths) {
  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, i) =>
      new TableRow({
        tableHeader: i === 0,
        children: r.map((c, j) => cell(c, {
          header: i === 0, w: widths[j],
          bg: i > 0 && i % 2 === 0 ? ROWBG : "FFFFFF",
        })),
      })),
  });
}

const spacer = (h = 120) => new Paragraph({ spacing: { after: h }, children: [] });

// ---- document content ----
const children = [];

// Title page
children.push(
  new Paragraph({ spacing: { before: 1800, after: 0 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "ParkSense", bold: true, size: 80, color: NAVY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [new TextRun({ text: "Parking-Induced Congestion Intelligence", size: 30, color: AMBER })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [new TextRun({ text: "for Traffic-Enforcement Command Centres", size: 24, color: MUT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 480, after: 40 },
    children: [new TextRun({ text: "Flipkart Gridlock 2.0", size: 22, color: INK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 480 },
    children: [new TextRun({ text: "Theme: Poor Visibility on Parking-Induced Congestion", italics: true, size: 20, color: MUT })] }),
);
// title-page facts table
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [] }));
children.push(table([
  ["Project Documentation", ""],
  ["Live application", "parksense-e1w1.onrender.com"],
  ["Source code", "github.com/keshavhacker1609/parksense"],
  ["API documentation", "parksense-e1w1.onrender.com/docs"],
  ["Team", "Keshav Singla · Aadya Jain · Purva Jain · Shravani Singh"],
], [2600, 6760]));
children.push(new Paragraph({ children: [new PageBreak()] }));

// TOC
children.push(H1("Table of Contents"));
children.push(new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// 1 Team
children.push(H1("1. The Team"));
children.push(P("ParkSense was designed and built by a four-member team. The work spans a reproducible data pipeline, a typed analytical API, a machine-learning forecast, and a production-grade single-page command console — integrated into one deployable product."));
children.push(table([
  ["Member", "Role"],
  ["Keshav Singla", "Team lead · backend, analytics engine (CIS, enforcement gap), deployment"],
  ["Aadya Jain", "Data pipeline · parsing, feature engineering, forecasting model"],
  ["Purva Jain", "Frontend · map console, deck.gl visualisation, UI/UX"],
  ["Shravani Singh", "Analytics & validation · methodology, testing, documentation"],
], [2600, 6760]));
children.push(spacer());

// 2 Executive summary
children.push(H1("2. Executive Summary — What We Made"));
children.push(P("ParkSense is a decision tool, not a dashboard. It converts a raw log of ~298,000 Bengaluru parking-violation records into a ranked, explainable list of where traffic enforcement should act first — and where it is currently failing to act."));
children.push(P("The product is built around three computed instruments:"));
children.push(numbered("Congestion Impact Score (CIS) — a transparent per-location score that ranks every geographic cell by how much it obstructs traffic flow, weighting what the violation is (not merely how many)."));
children.push(numbered("Enforcement Efficiency Gap — a per-station measure that exposes high-impact, under-enforced zones — the single most actionable insight for reallocating patrols."));
children.push(numbered("Short-horizon hotspot forecasting — a backtested model that predicts each hotspot's next-day intensity, plus an emerging-hotspot detector for watch zones."));
children.push(P("These are surfaced through a dark, data-dense command console: a full-bleed impact heatmap, a filter rail, and an insight panel delivering the prioritised action list with an audit-grade breakdown of every score."));
children.push(H2("Headline figures (all computed from the data)"));
children.push(table([
  ["Metric", "Value"],
  ["Incidents analysed", "298,450"],
  ["Violations (multi-label, exploded)", "348,455"],
  ["Distinct vehicles tracked", "231,890"],
  ["H3 impact cells (resolution 9)", "2,534"],
  ["Police stations profiled", "54"],
  ["Under-enforced high-impact stations flagged", "18"],
  ["Emerging-hotspot watch zones", "28"],
  ["Observed window", "9 Nov 2023 – 8 Apr 2024 (Asia/Kolkata)"],
  ["Forecast accuracy", "MAE 3.77 vs. naïve 4.23 (+11% skill)"],
], [5600, 3760]));
children.push(spacer());

// screenshot 1
children.push(H2("The command console"));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
  children: [new ImageRun({ type: "png", data: fs.readFileSync(SHOT + "01_command_heatmap.png"),
    transformation: { width: 600, height: 337 },
    altText: { title: "ParkSense command console", description: "Impact heatmap with priority list", name: "console" } })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
  children: [new TextRun({ text: "The live impact heatmap, filter rail, and prioritised enforcement panel.", italics: true, size: 18, color: MUT })] }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// 3 Problem
children.push(H1("3. The Problem and Why It Matters"));
children.push(P("Illegal and careless parking is one of the largest, least-managed contributors to urban congestion. A single vehicle stopped on a main road, a footpath, or near a junction can throttle a lane for hours, cascading delays across a corridor."));
children.push(P("The Gridlock 2.0 brief frames it precisely: quantify the impact of parking violations on traffic flow to enable targeted enforcement. The key word is impact."));
children.push(P("**Why most approaches fall short.** The violations in the dataset are already detected and labelled. Plotting them on a map only re-states what is already known — a wall of dots with no priority, no explanation, and no link to enforcement effectiveness. A command centre cannot act on 298,000 undifferentiated points."));
children.push(P("**The real, unanswered question** is therefore not “where are violations?” but: which locations are doing the most damage to traffic flow, and where is enforcement effort failing to match that damage?"));
children.push(P("ParkSense exists to answer exactly that — turning an opaque log into visible, ranked, explainable priorities, directly addressing the chosen theme, Poor Visibility on Parking-Induced Congestion."));

// 4 Solution
children.push(H1("4. Our Solution"));
children.push(P("ParkSense treats the problem as a prioritisation and resource-allocation problem, solved with three layers that build on each other."));
children.push(H2("4.1 Measure impact (CIS)"));
children.push(P("Every location is scored by how much it actually obstructs flow — combining violation severity, vehicle footprint, density, persistence and peak-hour pressure — rather than by raw count. A bus blocking a main road outranks a scooter on a quiet lane, which is how a traffic officer would triage."));
children.push(H2("4.2 Expose the enforcement gap"));
children.push(P("We compare each station's congestion impact against its enforcement performance. The output is a ranked list of zones that are high-impact but under-enforced — precisely where redeploying patrols yields the most benefit."));
children.push(H2("4.3 Look ahead (forecast + anomalies)"));
children.push(P("We forecast next-day intensity per hotspot and flag cells whose recent activity is spiking versus their own baseline, so teams can pre-position rather than react."));

// 5 Dataset
children.push(H1("5. The Dataset"));
children.push(P("A single CSV of Bengaluru parking-violation records. The schema and its quirks drove many of our engineering decisions. Parsing challenges we handled robustly:"));
children.push(bullet("**JSON arrays inside CSV cells** — violation_type and offence_code are JSON-encoded arrays; one row can carry several violations. We parse and explode them, taking per-incident severity as the maximum over its types."));
children.push(bullet("**Literal \"NULL\" tokens** — normalised to real missing values rather than treated as text."));
children.push(bullet("**Timezone-aware timestamps** — source times are UTC; converted to Asia/Kolkata before any temporal analysis."));
children.push(bullet("**Date range from the data, not the filename** — the true window (9 Nov 2023 – 8 Apr 2024) is computed from created_datetime."));
children.push(bullet("**Coordinate sanity bounds** — rows outside Bengaluru are dropped."));
children.push(bullet("**Stable anonymised vehicle_number** — used for repeat-offender and chronic-location analysis."));
children.push(P("**A critical data-quality finding.** On inspection, action_taken_timestamp and closed_datetime are 100% NULL across the dataset. Rather than fabricate enforcement metrics, we pivoted the enforcement analytics to the field that is populated (~58% coverage): validation_status / validation_timestamp. Enforcement latency is therefore measured as created → validation. Where a value genuinely cannot be computed, we do not display it. This honesty is a deliberate design principle."));

// 6 Analytics
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("6. How It Works — The Analytics Layer"));
children.push(H2("6.1 Congestion Impact Score (CIS)"));
children.push(P("CIS is a transparent weighted composite, computed per H3 cell, normalised to 0–100, and damped by a recurrence-confidence factor."));
children.push(new Paragraph({ spacing: { after: 60 }, shading: { fill: "F0F3F6", type: ShadingType.CLEAR },
  children: [new TextRun({ text: "CIS_raw = w_sev·severity + w_foot·footprint + w_dens·density + w_pers·persistence + w_peak·peak_pressure", font: "Consolas", size: 18 })] }));
children.push(new Paragraph({ spacing: { after: 120 }, shading: { fill: "F0F3F6", type: ShadingType.CLEAR },
  children: [new TextRun({ text: "CIS = (CIS_raw / Σw) · 100 · confidence,    confidence = n / (n + k),  k = 25", font: "Consolas", size: 18 })] }));
children.push(table([
  ["Component", "Weight", "Definition"],
  ["Severity", "0.35", "Mean flow-obstruction ordinal of the cell's violation mix (footpath / main-road / crossing highest; non-obstructive offences lowest)."],
  ["Vehicle footprint", "0.20", "Mean carriageway width consumed by the vehicle mix (scooter 1.0 → bus 6.5)."],
  ["Density", "0.20", "Incident volume per cell, log-compressed then min-max normalised."],
  ["Persistence", "0.10", "Fraction of the observed window the cell was active — chronic vs. one-off."],
  ["Peak pressure", "0.15", "Share of incidents in the data-derived peak hours."],
], [1900, 1100, 6360]));
children.push(spacer());
children.push(P("**Data-derived peak hours.** Rather than assuming rush hours, we take the top quartile of hours by volume — for this dataset, 04, 05, 08, 09, 10, 11 (local) — surfaced explicitly in the UI."));
children.push(P("**Why the confidence factor?** Severity, footprint and peak pressure can be high for a single unlucky incident. A prioritisation tool must not rank that beside a chronic hotspot, so the composite is shrunk by n/(n+k): a cell needs roughly k incidents to reach half weight. This removed low-evidence one-offs from the top of the ranking."));
children.push(P("**Transparency.** Each component's contribution is stored and shown on hover, so any score is auditable in one glance. The same formula is implemented once in Python and faithfully re-implemented in SQL so filtered map views recompute the score for exactly the slice on screen."));

children.push(H2("6.2 Enforcement Efficiency Gap"));
children.push(bullet("**Impact** = sum of the CIS of every cell the station is responsible for."));
children.push(bullet("**Enforcement performance** = mean of two percentile ranks — cases processed (validation rate) and turnaround speed (low median validation latency). Rejection rate is reported but not penalised."));
children.push(bullet("**Gap** = impact percentile − performance percentile. A large positive gap → flagged under-enforced."));
children.push(P("This produces the product's sharpest line, e.g. “HAL Old Airport ranks in the 94th percentile for congestion impact but only the 27th for enforcement performance.” 18 stations are flagged — a ready-made patrol-reallocation list."));

children.push(H2("6.3 Hotspot Forecasting"));
children.push(P("A daily per-cell intensity model over the busiest cells: LightGBM with a Tweedie objective, on lag (1/2/3/7/14 d), rolling mean/std (7/14 d), calendar, and a spatial-neighbour signal (H3 ring-1, lagged). Evaluated on a held-out final 21 days — the model never sees the test window during training."));
children.push(table([
  ["Metric", "Value"],
  ["MAE", "3.77"],
  ["MAE — naïve persistence baseline", "4.23"],
  ["Skill vs. naïve", "+11.0%"],
  ["MAPE", "96.8% (inflated by many low-count days; MAE is the honest headline)"],
], [4200, 5160]));
children.push(spacer());
children.push(P("We publish the persistence baseline alongside the model so the gain is provable, not asserted."));
children.push(H2("6.4 Emerging-hotspot / Anomaly Detection"));
children.push(P("We flag cells whose recent-window mean exceeds their own historical baseline by a rolling z-score threshold. These become watch zones (28 detected) — locations trending up before they become established hotspots."));

// screenshot 2
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
  children: [new ImageRun({ type: "png", data: fs.readFileSync(SHOT + "02_cis_breakdown.png"),
    transformation: { width: 600, height: 337 },
    altText: { title: "CIS breakdown", description: "Selected cell component breakdown", name: "breakdown" } })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
  children: [new TextRun({ text: "Selecting a hotspot reveals its CIS components, enforcement gap and next-day forecast.", italics: true, size: 18, color: MUT })] }));

// 7 Architecture
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("7. System Architecture"));
children.push(P("**Two-phase design.** Heavy computation (parsing, scoring, model training) runs once in the offline pipeline and is persisted as Parquet/JSON artifacts. The API then serves these instantly and recomputes only filter-dependent aggregates on demand — keeping the live product fast and the analytics reproducible."));
children.push(table([
  ["Stage", "What happens"],
  ["pipeline/ingest.py", "Clean CSV · explode JSON · UTC→IST · H3 index → violations.parquet"],
  ["pipeline/features.py", "CIS · enforcement gap · anomalies · meta → hex/station/anomaly.parquet + meta.json"],
  ["pipeline/forecast.py", "LightGBM training + backtest → forecast.parquet"],
  ["DuckDB + FastAPI", "In-process columnar SQL over Parquet; typed REST with server-side aggregation"],
  ["React SPA", "MapLibre GL + deck.gl (H3HexagonLayer) + ECharts"],
], [2700, 6660]));
children.push(spacer());
children.push(P("**Single-service deployment.** For the live demo, the built frontend is served by the same FastAPI process that serves the API — one URL, no CORS, one container. The Docker image ships the precomputed artifacts, so the deployed service needs no raw CSV."));

// 8 Stack
children.push(H1("8. Technology Stack and Why We Chose It"));
children.push(table([
  ["Layer", "Technology", "Why"],
  ["Analytical engine", "DuckDB", "Columnar, in-process, zero-setup SQL over Parquet; runs instantly, no DB server."],
  ["Geospatial index", "Uber H3", "Hexagonal cells give uniform, distortion-free spatial aggregation."],
  ["Backend", "FastAPI + Pydantic", "Typed, async, automatic OpenAPI docs, fast."],
  ["Forecasting", "LightGBM + scikit-learn", "Strong, fast gradient boosting; Tweedie objective fits the count target."],
  ["Data processing", "pandas + pyarrow", "Robust parsing and Parquet I/O."],
  ["Frontend", "React + TypeScript + Vite", "Type-safe, fast dev/build."],
  ["Mapping", "MapLibre GL + deck.gl", "GPU-accelerated H3HexagonLayer; free, key-less basemap."],
  ["Charts", "ECharts", "Restrained, control-room-grade charts."],
  ["Packaging / hosting", "Docker / Render", "One image hosts UI + API; free, blueprint-driven deploy."],
], [2100, 2600, 4660]));
children.push(spacer());
children.push(P("No paid APIs are required to run. Everything works offline from the CSV; the basemap is a free MapLibre raster style."));

// 9 API
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("9. API Reference"));
children.push(P("Base URL: parksense-e1w1.onrender.com · Interactive docs: /docs. All aggregation is server-side — the browser never receives raw rows."));
children.push(table([
  ["Endpoint", "Purpose"],
  ["GET /health", "Liveness + total incident count."],
  ["GET /api/v1/meta", "Date range, distinct filter values, totals, peak hours, CIS quantile breaks, backtest."],
  ["GET /api/v1/hexes", "H3 cells with filter-aware CIS and full component breakdown."],
  ["GET /api/v1/hotspots/priority", "Ranked enforcement action list with CIS, station, gap, recommendation."],
  ["GET /api/v1/enforcement/gap", "Per-station impact vs. enforcement performance, with under-enforced flag."],
  ["GET /api/v1/forecast", "Per-cell next-day forecast + backtest error."],
  ["GET /api/v1/anomalies", "Emerging-hotspot watch zones."],
  ["GET /api/v1/trends", "Time series grouped by hour / dow / month / vehicle / violation."],
  ["GET /api/v1/enforcement/latency", "Validation-latency distribution."],
  ["GET /api/v1/incident/{id}", "Single-record drill-down."],
], [3500, 5860]));

// 10 UI
children.push(H1("10. The User Interface"));
children.push(P("A single-purpose command console, not a marketing site."));
children.push(H2("Command view"));
children.push(bullet("A full-bleed dark impact heatmap (deck.gl H3HexagonLayer) with a legend tied to real CIS quantiles and a resolution switch (H3 8 / 9 / 10)."));
children.push(bullet("A left filter rail — date range, violation type, vehicle type, station — populated from /meta, multi-select, instant; every change recomputes the score server-side."));
children.push(bullet("A right insight panel — prioritised enforcement list, selected-cell CIS breakdown, next-day forecast, and the under-enforced high-impact zone callout."));
children.push(bullet("A top bar with live computed totals and the true data date range."));
children.push(H2("Analytics view"));
children.push(bullet("Hourly violation pressure with the derived peak windows highlighted; day-of-week and monthly trends; violation and vehicle composition; enforcement validation-latency distribution."));
children.push(P("**Design language.** Deep neutral slate base, one disciplined amber signal colour, a perceptually-uniform inferno ramp for impact (colour-blind safe), Inter + IBM Plex Mono with tabular numerals, and designed empty/loading/error states. It is meant to feel like an internal tool a traffic department paid for."));

// 11 Build process
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("11. How We Built It — Engineering Process"));
children.push(P("We followed a strict execution order so each layer rested on a verified one:"));
children.push(numbered("Pipeline first — robust parsing (JSON arrays, NULLs, timezones) → Parquet → validated schema → meta queries, with computed meta printed to confirm parsing."));
children.push(numbered("Scoring + enforcement gap, with unit tests on the provably-correct core."));
children.push(numbered("FastAPI endpoints over DuckDB, with OpenAPI."));
children.push(numbered("Map console consuming the real endpoints."));
children.push(numbered("Forecasting + anomaly models, wired into the insight panel with honest error reporting."));
children.push(numbered("Polish + deploy — designed states, legend, reproducibility, Docker, live hosting."));
children.push(H2("Principles we held throughout"));
children.push(bullet("**Zero hardcoding** — every threshold, weight, resolution and ranking is derived at runtime or lives in one typed config."));
children.push(bullet("**Accuracy over flash** — no invented metrics; every chart traces to a real query."));
children.push(bullet("**Reproducibility** — the whole pipeline rebuilds from the raw CSV in ~30 seconds."));
children.push(H2("Issues we found and fixed during verification"));
children.push(bullet("Domain tables (severity/footprint) initially didn't match the dataset's exact category strings (e.g. BUS (BMTC/KSRTC)); corrected against distinct queries."));
children.push(bullet("A single DuckDB connection caused intermittent 500s under FastAPI's concurrent threadpool; fixed with a lock."));
children.push(bullet("UNNEST inside SELECT … GROUP BY is rejected by DuckDB; rewritten as a subquery."));

// 12 Running
children.push(H1("12. Running the Project"));
children.push(H2("Option A — Live demo (no setup)"));
children.push(P("Open parksense-e1w1.onrender.com. API docs at /docs. (Free tier sleeps after 15 min idle; first request may take ~50 s to wake.)"));
children.push(H2("Option B — Docker (one command)"));
children.push(new Paragraph({ shading: { fill: "F0F3F6", type: ShadingType.CLEAR }, spacing: { after: 120 }, children: [new TextRun({ text: "docker build -t parksense .   &&   docker run -p 8000:8000 parksense", font: "Consolas", size: 18 })] }));
children.push(H2("Option C — Local development"));
children.push(P("Prerequisites: Python 3.11+, Node 18+. Place the dataset at data/violations_raw.csv, then:"));
[
  "python -m venv .venv",
  ".venv\\Scripts\\python -m pip install -r backend\\requirements.txt",
  ".venv\\Scripts\\python -m pipeline.run_all        # build parquet + scores + model (~30s)",
  ".venv\\Scripts\\python -m uvicorn backend.app.main:app --port 8011",
  "cd frontend && npm install && npm run dev          # open http://localhost:5181",
].forEach((c) => children.push(new Paragraph({ shading: { fill: "F0F3F6", type: ShadingType.CLEAR }, spacing: { after: 40 }, children: [new TextRun({ text: c, font: "Consolas", size: 18 })] })));

// 13 Testing
children.push(H1("13. Testing and Quality"));
children.push(P("The provably-correct core is covered by unit tests: JSON-array and NULL-token parsing; violation-severity and vehicle-footprint mapping; scoring helpers; data-derived peak-hour selection; and monotonicity of the confidence-shrinkage factor (11 tests pass). The frontend is fully typed and type-checks clean, and builds for production without errors. The Docker image was built and run locally before deployment to verify the single-service setup end to end."));

// 14 Structure
children.push(H1("14. Project Structure"));
[
  "parksense/",
  "├─ backend/   app/api/routes.py · app/core/{config,store}.py · app/main.py · tests/",
  "├─ pipeline/  ingest.py · features.py · forecast.py · run_all.py",
  "├─ frontend/  src/components · api.ts · config.ts · theme.css",
  "├─ data/      parquet + meta artifacts (raw CSV gitignored)",
  "├─ docs/      documentation · methodology · screenshots · deck",
  "├─ Dockerfile · render.yaml · README.md",
].forEach((c) => children.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: c, font: "Consolas", size: 18 })] })));

// 15 Decisions
children.push(H1("15. Design Decisions and Trade-offs"));
children.push(bullet("**CIS as a transparent composite, not a learned score** — a command centre must trust and explain the priority, so we chose an auditable, weighted composite with visible components."));
children.push(bullet("**Confidence shrinkage over a hard cutoff** — degrades low-evidence cells smoothly instead of discarding them."));
children.push(bullet("**Validation lifecycle instead of empty action/closed fields** — forced by the data; the alternative would mislead."));
children.push(bullet("**Precompute + DuckDB rather than a live OLAP DB** — zero-setup, instantly runnable, fast enough that filtered CIS recomputes in milliseconds."));
children.push(bullet("**Single-service deployment** — simpler, one URL, no CORS."));

// 16 Limitations
children.push(H1("16. Limitations and Honest Caveats"));
children.push(bullet("action_taken / closed lifecycle fields are empty, so true closure latency cannot be measured; we use validation latency as the best available proxy."));
children.push(bullet("The forecast targets the busiest cells; MAPE is high due to many near-zero days — MAE and skill-vs-baseline are the honest measures."));
children.push(bullet("Severity and footprint ordinals encode domain judgement; they are fully visible in config and easily tuned by a traffic authority."));
children.push(bullet("The free hosting tier sleeps when idle, adding a one-time cold-start delay."));

// 17 Future
children.push(H1("17. Future Work"));
children.push(bullet("Ingest live feeds for rolling, real-time CIS and same-day forecasts."));
children.push(bullet("Calibrate severity/footprint weights against measured traffic-speed data per corridor."));
children.push(bullet("Route-aware impact (network effects of a blockage on connected roads)."));
children.push(bullet("Officer-facing mobile view with turn-by-turn patrol routing over the priority list."));
children.push(bullet("Closed-loop evaluation: measure congestion change after enforcement is reallocated to flagged zones."));
children.push(new Paragraph({ spacing: { before: 360 }, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "ParkSense — from a 298,000-row log to a daily patrol plan.", italics: true, color: MUT, size: 20 })] }));

// ---- assemble ----
const doc = new Document({
  creator: "ParkSense Team",
  title: "ParkSense — Project Documentation",
  styles: {
    default: { document: { run: { font: "Calibri", size: 22, color: INK } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, color: NAVY, font: "Calibri" },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: AMBER, font: "Calibri" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
      { reference: "n", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "ParkSense · Flipkart Gridlock 2.0          Page ", size: 16, color: MUT }),
                   new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUT })] })] }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("C:/Users/Kesha/Desktop/gridlock/docs/ParkSense_Documentation.docx", buf);
  console.log("WROTE docs/ParkSense_Documentation.docx");
});
