const pptx = require("pptxgenjs");
const p = new pptx();
p.defineLayout({ name: "W", width: 13.333, height: 7.5 });
p.layout = "W";

/* ---------- design system ---------- */
const INK = "0E1216", PANEL = "161D23", PANEL2 = "1C262E", LINE = "27313A", HAIR = "3A4650";
const FG = "EDF1F5", MUT = "9AA6B1", FAINT = "63707B";
const AMBER = "F0A93B", CYAN = "56CCD6";
const RAMP = ["7A1F6D", "C03A4E", "ED6A26", "F4B41F"];
const DISP = "Segoe UI Semibold", LIGHT = "Segoe UI Light", BODY = "Segoe UI", MONO = "Consolas";
const SHOT = "C:/Users/Kesha/Desktop/gridlock/docs/screenshots/";
const N = 10;

const bg = (s) => (s.background = { color: INK });
const rect = (s, x, y, w, h, fill, opts = {}) =>
  s.addShape(p.ShapeType.rect, { x, y, w, h, fill: { color: fill }, line: { type: "none" }, ...opts });
const rrect = (s, x, y, w, h, fill, line) =>
  s.addShape(p.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.05, fill: { color: fill }, line: line || { type: "none" } });

function footer(s, i) {
  s.addText("PARKSENSE", { x: 0.7, y: 7.05, w: 4, h: 0.3, fontFace: MONO, fontSize: 9, color: FAINT, charSpacing: 2 });
  s.addText(`${String(i).padStart(2, "0")} / ${N}`, { x: 8.6, y: 7.05, w: 4.03, h: 0.3, fontFace: MONO, fontSize: 9, color: FAINT, align: "right", charSpacing: 2 });
}
function kicker(s, num, label, color = AMBER) {
  s.addText([{ text: num + "   ", options: { color, bold: true } }, { text: label.toUpperCase(), options: { color: MUT } }],
    { x: 0.7, y: 0.52, w: 11.9, h: 0.3, fontFace: MONO, fontSize: 12, charSpacing: 3 });
}
function title(s, t, opts = {}) {
  s.addText(t, { x: 0.7, y: 0.92, w: 11.6, h: 1.0, fontFace: DISP, fontSize: 33, color: FG, bold: true, lineSpacingMultiple: 1.0, ...opts });
}

/* ===================================================================== */
/* 1 — TITLE (split: ink panel left, heatmap right)                      */
/* ===================================================================== */
let s = p.addSlide(); bg(s);
s.addImage({ path: SHOT + "01_command_heatmap.png", x: 6.9, y: 0, w: 6.433, h: 7.5, sizing: { type: "cover", w: 6.433, h: 7.5 } });
rect(s, 0, 0, 6.9, 7.5, INK);
rect(s, 6.88, 0, 0.03, 7.5, AMBER);
s.addText("FLIPKART GRIDLOCK 2.0  ·  ROUND 2", { x: 0.8, y: 0.85, w: 6, h: 0.3, fontFace: MONO, fontSize: 11, color: FAINT, charSpacing: 2 });
s.addText("ParkSense", { x: 0.74, y: 2.35, w: 6, h: 1.2, fontFace: DISP, fontSize: 60, color: FG, bold: true });
s.addText("Parking-Induced Congestion Intelligence", { x: 0.8, y: 3.55, w: 5.9, h: 0.5, fontFace: BODY, fontSize: 18, color: AMBER });
s.addText("A decision tool for traffic-enforcement command centres — turning 298,450 violation records into a ranked patrol plan.",
  { x: 0.8, y: 4.15, w: 5.7, h: 1.0, fontFace: LIGHT, fontSize: 15, color: MUT, lineSpacingMultiple: 1.25 });
rect(s, 0.8, 5.55, 0.55, 0.02, HAIR);
s.addText("Keshav Singla   ·   Aadya Jain   ·   Purva Jain   ·   Shravani Singh",
  { x: 0.8, y: 5.7, w: 6, h: 0.3, fontFace: BODY, fontSize: 12, color: FG });
s.addText("parksense-e1w1.onrender.com", { x: 0.8, y: 6.1, w: 6, h: 0.3, fontFace: MONO, fontSize: 11, color: CYAN });

/* ===================================================================== */
/* 2 — PROBLEM                                                           */
/* ===================================================================== */
s = p.addSlide(); bg(s); kicker(s, "01", "The problem"); footer(s, 2);
title(s, "Detection is solved.\nPrioritisation isn't.");
s.addText("Every violation in this dataset is already detected and labelled. The hard part is deciding where enforcement should go first.",
  { x: 0.7, y: 2.5, w: 6.2, h: 1.1, fontFace: BODY, fontSize: 16, color: FG, lineSpacingMultiple: 1.3 });
s.addText("A command centre cannot act on 298,000 dots on a map. It needs to know which locations are doing the most damage to traffic flow — and where enforcement is failing to match it.",
  { x: 0.7, y: 3.75, w: 6.2, h: 1.6, fontFace: LIGHT, fontSize: 15, color: MUT, lineSpacingMultiple: 1.35 });
s.addText("The brief asks to quantify impact to enable targeted enforcement. That quantification is the product.",
  { x: 0.7, y: 5.45, w: 6.2, h: 1.0, fontFace: BODY, fontSize: 14, italic: true, color: FAINT, lineSpacingMultiple: 1.3 });
const ptiles = [["298,450", "incidents analysed"], ["348,455", "violations, multi-label & exploded"], ["2,534", "geographic impact cells"]];
ptiles.forEach((t, i) => {
  const y = 2.5 + i * 1.45;
  rrect(s, 7.55, y, 5.08, 1.25, PANEL, { color: LINE, width: 1 });
  rect(s, 7.55, y, 0.06, 1.25, RAMP[i + 1]);
  s.addText(t[0], { x: 7.85, y: y + 0.12, w: 4.5, h: 0.7, fontFace: LIGHT, fontSize: 40, color: FG });
  s.addText(t[1], { x: 7.87, y: y + 0.85, w: 4.6, h: 0.32, fontFace: BODY, fontSize: 12.5, color: MUT });
});

/* ===================================================================== */
/* 3 — THESIS / why different                                            */
/* ===================================================================== */
s = p.addSlide(); bg(s); kicker(s, "02", "Our thesis"); footer(s, 3);
title(s, "We don't compete on detection.\nWe compete on impact.");
const colY = 2.75, colH = 3.6;
// left: most teams
rrect(s, 0.7, colY, 5.8, colH, PANEL, { color: LINE, width: 1 });
s.addText("MOST SUBMISSIONS", { x: 1.0, y: colY + 0.28, w: 5.2, h: 0.3, fontFace: MONO, fontSize: 11, color: FAINT, charSpacing: 2 });
s.addText("Plot the violations on a map.", { x: 1.0, y: colY + 0.65, w: 5.2, h: 0.5, fontFace: DISP, fontSize: 18, color: FG, bold: true });
["Re-states what is already known", "A wall of undifferentiated dots", "No priority, no explanation", "No link to enforcement effort"].forEach((t, i) =>
  s.addText("—   " + t, { x: 1.0, y: colY + 1.35 + i * 0.5, w: 5.2, h: 0.4, fontFace: BODY, fontSize: 13.5, color: MUT }));
// right: parksense
rrect(s, 6.83, colY, 5.8, colH, PANEL2, { color: AMBER, width: 1.25 });
s.addText("PARKSENSE", { x: 7.13, y: colY + 0.28, w: 5.2, h: 0.3, fontFace: MONO, fontSize: 11, color: AMBER, charSpacing: 2 });
s.addText("Score and rank the impact.", { x: 7.13, y: colY + 0.65, w: 5.2, h: 0.5, fontFace: DISP, fontSize: 18, color: FG, bold: true });
["Weights what the violation is, not just how many", "An explainable Congestion Impact Score", "A ranked, prioritised action list", "Flags high-impact, under-enforced zones"].forEach((t, i) =>
  s.addText("→   " + t, { x: 7.13, y: colY + 1.35 + i * 0.5, w: 5.2, h: 0.4, fontFace: BODY, fontSize: 13.5, color: FG }));

/* ===================================================================== */
/* 4 — SOLUTION                                                          */
/* ===================================================================== */
s = p.addSlide(); bg(s); kicker(s, "03", "The solution"); footer(s, 4);
title(s, "Three instruments, one action list");
const inst = [
  ["01", "Congestion Impact Score", "A transparent per-location score — severity, vehicle footprint, density, persistence and peak pressure, normalised to 0–100.", RAMP[3]],
  ["02", "Enforcement Efficiency Gap", "Impact vs. enforcement performance per station. Surfaces the high-impact, under-enforced zones to reallocate patrols.", RAMP[2]],
  ["03", "Hotspot Forecasting", "A backtested per-cell model for next-day intensity, plus emerging-hotspot watch zones — pre-position, don't react.", RAMP[1]],
];
inst.forEach((it, i) => {
  const y = 2.45 + i * 1.5;
  rrect(s, 0.7, y, 11.93, 1.32, PANEL, { color: LINE, width: 1 });
  s.addText(it[0], { x: 0.95, y: y + 0.22, w: 1.3, h: 0.9, fontFace: LIGHT, fontSize: 44, color: it[3] });
  s.addText(it[1], { x: 2.45, y: y + 0.2, w: 9.9, h: 0.45, fontFace: DISP, fontSize: 19, color: FG, bold: true });
  s.addText(it[2], { x: 2.45, y: y + 0.68, w: 9.9, h: 0.55, fontFace: BODY, fontSize: 13.5, color: MUT, lineSpacingMultiple: 1.1 });
});

/* ===================================================================== */
/* 5 — CIS                                                               */
/* ===================================================================== */
s = p.addSlide(); bg(s); kicker(s, "04", "Instrument 01 — Congestion Impact Score"); footer(s, 5);
title(s, "A score you can defend");
rrect(s, 0.7, 2.4, 6.0, 0.62, "12181D", { color: LINE, width: 1 });
s.addText("CIS = (Σ wᵢ·componentᵢ / Σw) · 100 · n/(n+k)", { x: 0.85, y: 2.4, w: 5.8, h: 0.62, fontFace: MONO, fontSize: 14, color: CYAN, valign: "middle" });
const comp = [["0.35", "Severity", "footpath / main-road obstruction"], ["0.20", "Footprint", "carriageway width by vehicle type"], ["0.20", "Density", "incident volume, log-scaled"], ["0.10", "Persistence", "chronic vs. one-off activity"], ["0.15", "Peak pressure", "share in data-derived peak hours"]];
comp.forEach((c, i) => {
  const y = 3.3 + i * 0.6;
  s.addText(c[0], { x: 0.7, y, w: 0.75, h: 0.5, fontFace: MONO, fontSize: 15, color: AMBER, bold: true, valign: "middle" });
  s.addText(c[1], { x: 1.5, y, w: 2.2, h: 0.5, fontFace: DISP, fontSize: 14, color: FG, bold: true, valign: "middle" });
  s.addText(c[2], { x: 3.55, y, w: 3.15, h: 0.5, fontFace: BODY, fontSize: 11.5, color: MUT, valign: "middle" });
});
s.addText("Peak hours are derived from the data (04, 05, 08–11), not assumed. A confidence factor stops one-off incidents ranking beside chronic hotspots.",
  { x: 0.7, y: 6.35, w: 6.0, h: 0.7, fontFace: BODY, fontSize: 11.5, italic: true, color: FAINT, lineSpacingMultiple: 1.15 });
s.addImage({ path: SHOT + "02_cis_breakdown.png", x: 7.05, y: 2.4, w: 5.6, h: 3.15, sizing: { type: "contain", w: 5.6, h: 3.15 } });
rect(s, 7.05, 5.62, 5.6, 0.012, LINE);
s.addText("Every component is shown on hover — the score is auditable in one glance, never a black box.",
  { x: 7.05, y: 5.75, w: 5.6, h: 0.7, fontFace: BODY, fontSize: 12, color: MUT, align: "center", lineSpacingMultiple: 1.2 });

/* ===================================================================== */
/* 6 — ENFORCEMENT GAP                                                   */
/* ===================================================================== */
s = p.addSlide(); bg(s); kicker(s, "05", "Instrument 02 — Enforcement Efficiency Gap"); footer(s, 6);
title(s, "The line that changes the shift plan");
s.addText("We compare each station's congestion impact against its enforcement performance, then rank the divergence.",
  { x: 0.7, y: 2.35, w: 11.9, h: 0.6, fontFace: BODY, fontSize: 16, color: MUT });
rrect(s, 0.7, 3.2, 11.93, 2.5, PANEL, { color: AMBER, width: 1.25 });
s.addText("WORKED EXAMPLE  ·  HAL OLD AIRPORT", { x: 1.05, y: 3.45, w: 11, h: 0.32, fontFace: MONO, fontSize: 12, color: AMBER, charSpacing: 2 });
const gap = [["94th", "percentile for\ncongestion impact", FG], ["27th", "percentile for\nenforcement performance", RAMP[1]], ["0.68", "enforcement gap\n(impact − performance)", AMBER]];
gap.forEach((g, i) => {
  const x = 1.05 + i * 3.95;
  if (i) rect(s, x - 0.25, 3.95, 0.012, 1.4, LINE);
  s.addText(g[0], { x, y: 3.85, w: 3.6, h: 1.0, fontFace: LIGHT, fontSize: 56, color: g[2] });
  s.addText(g[1], { x: x + 0.03, y: 4.95, w: 3.5, h: 0.6, fontFace: BODY, fontSize: 12.5, color: MUT, lineSpacingMultiple: 1.0 });
});
s.addText("High damage, low coverage. ParkSense flags 18 such stations — a ready-made patrol-reallocation list.",
  { x: 0.7, y: 6.05, w: 11.9, h: 0.6, fontFace: BODY, fontSize: 15, italic: true, color: FG });

/* ===================================================================== */
/* 7 — FORECAST                                                          */
/* ===================================================================== */
s = p.addSlide(); bg(s); kicker(s, "06", "Instrument 03 — Hotspot Forecasting"); footer(s, 7);
title(s, "Forecast the next day — honestly");
s.addText("A daily per-cell LightGBM model on lag, calendar and spatial-neighbour features, validated on a held-out final 21 days the model never trains on.",
  { x: 0.7, y: 2.35, w: 11.9, h: 0.7, fontFace: BODY, fontSize: 16, color: MUT, lineSpacingMultiple: 1.25 });
const fc = [["3.77", "Model MAE", AMBER], ["4.23", "Naïve baseline MAE", MUT], ["+11%", "Skill vs. baseline", CYAN]];
fc.forEach((f, i) => {
  const x = 0.7 + i * 4.05;
  rrect(s, x, 3.35, 3.78, 1.85, PANEL, { color: LINE, width: 1 });
  s.addText(f[0], { x: x + 0.3, y: 3.55, w: 3.2, h: 1.0, fontFace: LIGHT, fontSize: 52, color: f[2] });
  s.addText(f[1], { x: x + 0.32, y: 4.6, w: 3.2, h: 0.4, fontFace: BODY, fontSize: 13.5, color: MUT });
});
s.addText("We publish the persistence baseline next to the model, so the gain is provable — not asserted. A rolling z-score flags 28 emerging watch zones before they peak.",
  { x: 0.7, y: 5.6, w: 11.9, h: 0.8, fontFace: BODY, fontSize: 14, italic: true, color: FAINT, lineSpacingMultiple: 1.3 });

/* ===================================================================== */
/* 8 — PRODUCT SHOWCASE (two screenshots)                                */
/* ===================================================================== */
s = p.addSlide(); bg(s); kicker(s, "07", "The product"); footer(s, 8);
title(s, "Built for a control room");
s.addImage({ path: SHOT + "01_command_heatmap.png", x: 0.7, y: 2.4, w: 5.85, h: 3.29, sizing: { type: "contain", w: 5.85, h: 3.29 } });
s.addImage({ path: SHOT + "03_analytics.png", x: 6.78, y: 2.4, w: 5.85, h: 3.29, sizing: { type: "contain", w: 5.85, h: 3.29 } });
s.addText("Command view — live impact heatmap, filter rail, prioritised action panel.",
  { x: 0.7, y: 5.78, w: 5.85, h: 0.6, fontFace: BODY, fontSize: 12, color: MUT, align: "center", lineSpacingMultiple: 1.15 });
s.addText("Analytics view — temporal pressure, composition, enforcement latency.",
  { x: 6.78, y: 5.78, w: 5.85, h: 0.6, fontFace: BODY, fontSize: 12, color: MUT, align: "center", lineSpacingMultiple: 1.15 });

/* ===================================================================== */
/* 9 — ENGINEERING & STACK                                               */
/* ===================================================================== */
s = p.addSlide(); bg(s); kicker(s, "08", "Engineering", CYAN); footer(s, 9);
title(s, "Engineered like a product, not a demo");
const cards = [
  ["Zero hardcoding", "Peak hours, thresholds, quantiles and filters are derived at runtime; all tunables live in one config."],
  ["Intellectual honesty", "On finding action/closed fields 100% empty, we used the populated validation lifecycle — no invented metrics."],
  ["Reproducible", "One command rebuilds parquet, scores and the model from raw data in ~30s. Unit tests cover the scoring core."],
  ["Real stack", "FastAPI · DuckDB · Uber H3 · LightGBM backend; React · TypeScript · MapLibre · deck.gl console."],
];
cards.forEach((c, i) => {
  const x = 0.7 + (i % 2) * 6.13, y = 2.45 + Math.floor(i / 2) * 1.95;
  rrect(s, x, y, 5.8, 1.72, PANEL, { color: LINE, width: 1 });
  rect(s, x, y, 0.06, 1.72, CYAN);
  s.addText(c[0], { x: x + 0.32, y: y + 0.22, w: 5.3, h: 0.45, fontFace: DISP, fontSize: 17, color: CYAN, bold: true });
  s.addText(c[1], { x: x + 0.32, y: y + 0.7, w: 5.25, h: 0.9, fontFace: BODY, fontSize: 13, color: MUT, lineSpacingMultiple: 1.18 });
});

/* ===================================================================== */
/* 10 — CLOSE (split)                                                    */
/* ===================================================================== */
s = p.addSlide(); bg(s);
s.addImage({ path: SHOT + "03_analytics.png", x: 6.9, y: 0, w: 6.433, h: 7.5, sizing: { type: "cover", w: 6.433, h: 7.5 } });
rect(s, 0, 0, 6.9, 7.5, INK);
rect(s, 6.88, 0, 0.03, 7.5, AMBER);
s.addText("FROM A 298K-ROW LOG", { x: 0.8, y: 2.15, w: 6, h: 0.35, fontFace: MONO, fontSize: 12, color: FAINT, charSpacing: 2 });
s.addText("To a daily\npatrol plan.", { x: 0.74, y: 2.55, w: 6, h: 1.7, fontFace: DISP, fontSize: 42, color: FG, bold: true, lineSpacingMultiple: 0.98 });
rect(s, 0.8, 4.55, 0.55, 0.02, HAIR);
s.addText([{ text: "Live   ", options: { color: AMBER, bold: true } }, { text: "parksense-e1w1.onrender.com", options: { color: FG } }],
  { x: 0.8, y: 4.75, w: 6, h: 0.35, fontFace: MONO, fontSize: 12 });
s.addText([{ text: "Code   ", options: { color: AMBER, bold: true } }, { text: "github.com/keshavhacker1609/parksense", options: { color: FG } }],
  { x: 0.8, y: 5.15, w: 6, h: 0.35, fontFace: MONO, fontSize: 12 });
s.addText("Keshav Singla · Aadya Jain · Purva Jain · Shravani Singh",
  { x: 0.8, y: 6.1, w: 6, h: 0.3, fontFace: BODY, fontSize: 12, color: MUT });

p.writeFile({ fileName: "C:/Users/Kesha/Desktop/gridlock/docs/ParkSense_Deck.pptx" })
  .then((f) => console.log("WROTE", f))
  .catch((e) => console.error("ERR", e.message));
