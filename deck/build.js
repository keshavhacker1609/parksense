const pptxgen = require("pptxgenjs");
const p = new pptxgen();
p.defineLayout({ name: "W", width: 13.333, height: 7.5 });
p.layout = "W";

const BG = "0D1013", PANEL = "161C22", LINE = "2C353E";
const FG = "E8EDF2", MUT = "94A0AC", FAINT = "6F7B87";
const AMBER = "E8A13A", CYAN = "4EC9D4";
const RAMP = ["8C2369", "C43C4E", "ED6925", "FCB519"];
const HF = "Segoe UI Semibold", BODY = "Segoe UI", MONO = "Consolas";
const SHOT = "C:/Users/Kesha/Desktop/gridlock/docs/screenshots/";

const bg = (s) => s.background = { color: BG };
const kicker = (s, t, color = AMBER) =>
  s.addText(t.toUpperCase(), { x: 0.7, y: 0.5, w: 11.9, h: 0.3, fontFace: MONO,
    fontSize: 11, color, charSpacing: 2, bold: true });
const title = (s, t, y = 0.85) =>
  s.addText(t, { x: 0.7, y, w: 11.9, h: 0.9, fontFace: HF, fontSize: 32,
    color: FG, bold: true });

// ---- Slide 1 — title -------------------------------------------------------
let s = p.addSlide(); bg(s);
s.addImage({ path: SHOT + "01_command_heatmap.png", x: 0, y: 0, w: 13.333, h: 7.5, sizing: { type: "cover", w: 13.333, h: 7.5 } });
s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: "0A0D10", transparency: 32 } });
s.addShape(p.ShapeType.rect, { x: 0, y: 4.25, w: 13.333, h: 3.25, fill: { color: BG, transparency: 12 } });
s.addText("PARKSENSE", { x: 0.7, y: 4.5, w: 12, h: 0.95, fontFace: HF, fontSize: 50, color: FG, bold: true, charSpacing: 1 });
s.addText("Congestion Impact Scoring for Targeted Parking Enforcement",
  { x: 0.72, y: 5.5, w: 12, h: 0.5, fontFace: BODY, fontSize: 19, color: AMBER });
s.addText("Turning 298,450 Bengaluru parking-violation records into a ranked enforcement decision tool.",
  { x: 0.72, y: 6.0, w: 11.5, h: 0.4, fontFace: BODY, fontSize: 14, color: MUT });
s.addText("Flipkart Gridlock 2.0  ·  Theme: Poor Visibility on Parking-Induced Congestion",
  { x: 0.72, y: 6.95, w: 12, h: 0.3, fontFace: MONO, fontSize: 11, color: FAINT });

// ---- Slide 2 — problem -----------------------------------------------------
s = p.addSlide(); bg(s);
kicker(s, "The problem");
title(s, "Detection is solved. Prioritisation isn't.");
s.addText([
  { text: "Every violation in this dataset is already detected and labelled. ", options: { color: FG } },
  { text: "A command centre cannot act on 298k dots on a map.", options: { color: AMBER, bold: true } },
], { x: 0.7, y: 1.95, w: 6.4, h: 1.0, fontFace: BODY, fontSize: 18, lineSpacingMultiple: 1.15 });
s.addText("It needs to know which locations do the most damage to traffic flow — and where enforcement effort fails to match that damage.",
  { x: 0.7, y: 3.05, w: 6.4, h: 1.2, fontFace: BODY, fontSize: 15, color: MUT, lineSpacingMultiple: 1.2 });
s.addText("The problem statement asks to “quantify impact on traffic flow to enable targeted enforcement.” That quantification is the product.",
  { x: 0.7, y: 4.5, w: 6.4, h: 1.2, fontFace: BODY, fontSize: 14, italic: true, color: FAINT, lineSpacingMultiple: 1.2 });

const stats = [["298,450", "incidents analysed"], ["348,455", "violations (multi-label, exploded)"], ["2,534", "H3 impact cells"]];
stats.forEach((st, i) => {
  const y = 1.95 + i * 1.55;
  s.addShape(p.ShapeType.roundRect, { x: 7.45, y, w: 5.15, h: 1.35, rectRadius: 0.06, fill: { color: PANEL }, line: { color: LINE, width: 1 } });
  s.addText(st[0], { x: 7.7, y: y + 0.12, w: 4.7, h: 0.75, fontFace: MONO, fontSize: 38, color: AMBER, bold: true });
  s.addText(st[1], { x: 7.72, y: y + 0.92, w: 4.7, h: 0.35, fontFace: BODY, fontSize: 13, color: MUT });
});

// ---- Slide 3 — three instruments ------------------------------------------
s = p.addSlide(); bg(s);
kicker(s, "Our approach");
title(s, "Three computed instruments, one action list");
const inst = [
  ["01", "Congestion Impact Score", "A transparent per-cell score that weights what the violation is, not just how many — severity, vehicle footprint, density, persistence and peak pressure.", RAMP[3]],
  ["02", "Enforcement Efficiency Gap", "Impact vs. enforcement performance per station. Surfaces the high-impact, under-enforced zones — the single most actionable insight.", RAMP[2]],
  ["03", "Hotspot Forecasting", "A backtested per-cell LightGBM model on lag, calendar and spatial-neighbour features. Reports its naïve baseline, so the gain is never overstated.", RAMP[1]],
];
inst.forEach((it, i) => {
  const y = 2.0 + i * 1.62;
  s.addShape(p.ShapeType.roundRect, { x: 0.7, y, w: 11.9, h: 1.42, rectRadius: 0.06, fill: { color: PANEL }, line: { color: LINE, width: 1 } });
  s.addText(it[0], { x: 0.95, y: y + 0.28, w: 1.1, h: 0.85, fontFace: MONO, fontSize: 40, color: it[3], bold: true });
  s.addText(it[1], { x: 2.3, y: y + 0.2, w: 10, h: 0.45, fontFace: HF, fontSize: 19, color: FG, bold: true });
  s.addText(it[2], { x: 2.3, y: y + 0.66, w: 10.0, h: 0.65, fontFace: BODY, fontSize: 13.5, color: MUT, lineSpacingMultiple: 1.1 });
});

// ---- Slide 4 — CIS ---------------------------------------------------------
s = p.addSlide(); bg(s);
kicker(s, "Instrument 01 · Congestion Impact Score");
title(s, "A principled score, not a black box");
s.addShape(p.ShapeType.roundRect, { x: 0.7, y: 1.95, w: 6.1, h: 0.75, rectRadius: 0.05, fill: { color: "12171C" }, line: { color: LINE, width: 1 } });
s.addText("CIS = (Σ wᵢ·componentᵢ / Σw) · 100 · n/(n+k)",
  { x: 0.85, y: 1.95, w: 5.8, h: 0.75, fontFace: MONO, fontSize: 14.5, color: CYAN, valign: "middle" });
const comp = [["Severity", "0.35", "footpath / main-road obstruction ≫ no-parking"],
  ["Vehicle footprint", "0.20", "a bus or LGV consumes far more carriageway"],
  ["Density", "0.20", "incident volume per cell (log-compressed)"],
  ["Persistence", "0.10", "chronic cells vs. one-off events"],
  ["Peak pressure", "0.15", "share in data-derived peak windows"]];
comp.forEach((c, i) => {
  const y = 2.95 + i * 0.62;
  s.addText(c[1], { x: 0.7, y, w: 0.7, h: 0.5, fontFace: MONO, fontSize: 15, color: AMBER, bold: true, valign: "middle" });
  s.addText(c[0], { x: 1.5, y, w: 2.5, h: 0.5, fontFace: HF, fontSize: 14, color: FG, bold: true, valign: "middle" });
  s.addText(c[2], { x: 3.95, y, w: 2.85, h: 0.5, fontFace: BODY, fontSize: 11.5, color: MUT, valign: "middle" });
});
s.addText("A recurrence-confidence factor n/(n+k) stops a single high-severity one-off from ranking beside a chronic hotspot. Every component is shown on hover.",
  { x: 0.7, y: 6.15, w: 6.1, h: 0.9, fontFace: BODY, fontSize: 12, italic: true, color: FAINT, lineSpacingMultiple: 1.15 });
s.addImage({ path: SHOT + "02_cis_breakdown.png", x: 7.05, y: 1.95, w: 5.55, h: 3.12, sizing: { type: "contain", w: 5.55, h: 3.12 } });
s.addText("Live component breakdown for a selected cell — auditable in one glance.",
  { x: 7.05, y: 5.15, w: 5.55, h: 0.4, fontFace: BODY, fontSize: 11, color: FAINT, align: "center" });

// ---- Slide 5 — enforcement gap --------------------------------------------
s = p.addSlide(); bg(s);
kicker(s, "Instrument 02 · Enforcement Efficiency Gap", RAMP[2]);
title(s, "Where impact and enforcement diverge");
s.addText("For every police station we compare congestion impact against enforcement performance (cases processed and turnaround speed), then rank the divergence.",
  { x: 0.7, y: 1.95, w: 12, h: 0.8, fontFace: BODY, fontSize: 16, color: MUT, lineSpacingMultiple: 1.2 });
s.addShape(p.ShapeType.roundRect, { x: 0.7, y: 3.0, w: 11.9, h: 2.45, rectRadius: 0.06, fill: { color: PANEL }, line: { color: AMBER, width: 1.25 } });
s.addText("WORKED EXAMPLE — HAL OLD AIRPORT", { x: 1.0, y: 3.25, w: 11, h: 0.35, fontFace: MONO, fontSize: 12, color: AMBER, bold: true, charSpacing: 1 });
const gap = [["94th", "percentile for\ncongestion impact", AMBER], ["27th", "percentile for\nenforcement performance", RAMP[1]], ["0.68", "enforcement gap\n(impact − performance)", FG]];
gap.forEach((g, i) => {
  const x = 1.0 + i * 3.9;
  s.addText(g[0], { x, y: 3.75, w: 3.6, h: 0.95, fontFace: MONO, fontSize: 52, color: g[2], bold: true });
  s.addText(g[1], { x: x + 0.04, y: 4.75, w: 3.6, h: 0.6, fontFace: BODY, fontSize: 13, color: MUT, lineSpacingMultiple: 1.0 });
});
s.addText("“This zone ranks near the top for impact but near the bottom for enforcement.”  The product flags 18 such under-enforced stations — a ready-made patrol-reallocation list.",
  { x: 0.7, y: 5.7, w: 11.9, h: 0.9, fontFace: BODY, fontSize: 14, italic: true, color: FAINT, lineSpacingMultiple: 1.2 });

// ---- Slide 6 — forecast ----------------------------------------------------
s = p.addSlide(); bg(s);
kicker(s, "Instrument 03 · Hotspot Forecasting", RAMP[1]);
title(s, "Accurate — and honestly reported");
s.addText("A daily per-cell LightGBM model (Tweedie objective) on lag, rolling, calendar and H3 ring-1 neighbour features. Validated on a held-out final 21 days — the model never sees the test window.",
  { x: 0.7, y: 1.95, w: 6.2, h: 1.4, fontFace: BODY, fontSize: 15, color: MUT, lineSpacingMultiple: 1.25 });
const fc = [["3.77", "Model MAE", AMBER], ["4.23", "Naïve persistence MAE", MUT], ["+11%", "Skill vs. baseline", CYAN]];
fc.forEach((f, i) => {
  const y = 1.95 + i * 1.6;
  s.addShape(p.ShapeType.roundRect, { x: 7.2, y, w: 5.4, h: 1.4, rectRadius: 0.06, fill: { color: PANEL }, line: { color: LINE, width: 1 } });
  s.addText(f[0], { x: 7.45, y: y + 0.15, w: 2.6, h: 0.95, fontFace: MONO, fontSize: 40, color: f[2], bold: true });
  s.addText(f[1], { x: 10.0, y: y + 0.35, w: 2.45, h: 0.7, fontFace: BODY, fontSize: 14, color: FG, valign: "middle" });
});
s.addText("We publish the persistence baseline alongside the model so the gain is provable, not asserted. Emerging-hotspot detection (rolling z-score) flags 28 watch zones before they peak.",
  { x: 0.7, y: 4.0, w: 6.2, h: 1.6, fontFace: BODY, fontSize: 14, italic: true, color: FAINT, lineSpacingMultiple: 1.25 });

// ---- Slide 7 — engineering rigor ------------------------------------------
s = p.addSlide(); bg(s);
kicker(s, "Why it's credible", CYAN);
title(s, "Built like an internal tool a department paid for");
const cards = [
  ["Zero hardcoding", "Peak hours, score thresholds, quantile breaks and every filter list are derived at runtime. All tunables sit in one config module."],
  ["Intellectual honesty", "action_taken / closed timestamps are 100% empty — so we built enforcement analytics on the populated validation lifecycle instead of inventing metrics."],
  ["Reproducible pipeline", "One command rebuilds Parquet, scores and the model from the raw CSV in ~30s. Unit tests cover the parsing and scoring core."],
  ["Real engineering stack", "FastAPI + DuckDB + Uber H3 backend with OpenAPI; React + TypeScript + MapLibre / deck.gl command console. Server-side aggregation throughout."],
];
cards.forEach((c, i) => {
  const x = 0.7 + (i % 2) * 6.05, y = 2.0 + Math.floor(i / 2) * 2.0;
  s.addShape(p.ShapeType.roundRect, { x, y, w: 5.85, h: 1.8, rectRadius: 0.06, fill: { color: PANEL }, line: { color: LINE, width: 1 } });
  s.addText(c[0], { x: x + 0.3, y: y + 0.22, w: 5.3, h: 0.45, fontFace: HF, fontSize: 17, color: CYAN, bold: true });
  s.addText(c[1], { x: x + 0.3, y: y + 0.72, w: 5.3, h: 0.95, fontFace: BODY, fontSize: 13, color: MUT, lineSpacingMultiple: 1.15 });
});

// ---- Slide 8 — close -------------------------------------------------------
s = p.addSlide(); bg(s);
s.addImage({ path: SHOT + "03_analytics.png", x: 0, y: 0, w: 13.333, h: 7.5, sizing: { type: "cover", w: 13.333, h: 7.5 } });
s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: "0A0D10", transparency: 18 } });
s.addShape(p.ShapeType.rect, { x: 0, y: 2.4, w: 13.333, h: 2.95, fill: { color: BG, transparency: 8 } });
s.addText("From a 298k-row log to a daily patrol plan.",
  { x: 0.7, y: 2.7, w: 12, h: 0.8, fontFace: HF, fontSize: 34, color: FG, bold: true });
s.addText("Open one screen, read where to act first, see why each location ranks there, and get warned about emerging hotspots before they peak.",
  { x: 0.72, y: 3.7, w: 11.4, h: 0.9, fontFace: BODY, fontSize: 16, color: MUT, lineSpacingMultiple: 1.2 });
s.addText([
  { text: "Repository   ", options: { color: AMBER, bold: true } },
  { text: "github.com/keshavhacker1609/parksense", options: { color: FG } },
], { x: 0.72, y: 4.75, w: 12, h: 0.4, fontFace: MONO, fontSize: 14 });

p.writeFile({ fileName: "C:/Users/Kesha/Desktop/gridlock/docs/ParkSense_Deck.pptx" })
  .then((f) => console.log("WROTE", f));
