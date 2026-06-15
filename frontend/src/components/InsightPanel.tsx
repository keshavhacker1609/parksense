import { useQuery } from "@tanstack/react-query";
import { api, type Meta, type PriorityItem } from "../api";
import { COMPONENT_LABELS, rampCss } from "../config";
import { useApp } from "../state";
import { ComponentBars, fmt, KV } from "./Bits";

function recommend(p: PriorityItem): string {
  if (p.under_enforced)
    return `High impact, under-enforced. Prioritise patrol coverage in ${p.police_station}.`;
  if ((p.c_severity ?? 0) >= (p.c_density ?? 0))
    return "Impact driven by obstructive violations — target severity, not just volume.";
  if ((p.median_validation_latency_h ?? 0) > 48)
    return "Slow validation turnaround — review processing backlog for this zone.";
  return "Sustained hotspot — maintain enforcement presence in peak windows.";
}

export function InsightPanel({ meta }: { meta: Meta }) {
  const { selectedHex, setSelectedHex } = useApp();
  const max = meta.top_cell_cis;

  const { data: prio, isLoading } = useQuery({
    queryKey: ["priority"], queryFn: () => api.priority(30),
  });
  const { data: gap } = useQuery({ queryKey: ["gap"], queryFn: () => api.gap() });

  const items = prio?.items ?? [];
  const selected = items.find((i) => i.h3 === selectedHex);
  const topUnder = (gap?.stations ?? []).filter((s) => s.under_enforced).slice(0, 1)[0];

  return (
    <aside className="insight">
      {selected ? (
        <SelectedHex item={selected} max={max} onBack={() => setSelectedHex(null)} />
      ) : (
        topUnder && (
          <div className="card alert">
            <div className="label" style={{ color: "var(--signal)", marginBottom: 6 }}>
              ▲ Under-enforced high-impact zone
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{topUnder.police_station}</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-1)", marginBottom: 8 }}>
              Ranks in the {Math.round(topUnder.impact_pct * 100)}th percentile for congestion impact
              but only the {Math.round(topUnder.perf_pct * 100)}th for enforcement performance.
            </div>
            <KV k="Enforcement gap" v={topUnder.gap.toFixed(2)} />
            <KV k="Median validation latency" v={`${fmt(topUnder.median_validation_latency_h, 1)} h`} />
            <KV k="Cases processed" v={`${Math.round(topUnder.validation_rate * 100)}%`} />
          </div>
        )
      )}

      <div className="label" style={{ margin: "4px 0 8px" }}>
        Prioritised enforcement actions
      </div>

      {isLoading ? (
        <div>{[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 40, marginBottom: 8 }} />
        ))}</div>
      ) : (
        <div>
          {items.map((p, i) => (
            <div
              key={p.h3}
              className={`prow ${p.h3 === selectedHex ? "sel" : ""}`}
              onClick={() => setSelectedHex(p.h3)}
            >
              <span className="rank num">{i + 1}</span>
              <div>
                <div className="name">{p.police_station ?? "Unattributed cell"}</div>
                <div className="meta num">
                  {fmt(p.incidents)} incidents
                  {p.under_enforced && <span className="tag under" style={{ marginLeft: 6 }}>under-enforced</span>}
                </div>
              </div>
              <span className="cis num" style={{ color: rampCss(p.cis / max) }}>{p.cis.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

function SelectedHex({ item, max, onBack }: { item: PriorityItem; max: number; onBack: () => void }) {
  const { data: fc } = useQuery({
    queryKey: ["forecast", item.h3], queryFn: () => api.forecast(item.h3),
    retry: false,
  });

  const parts = (["c_severity", "c_footprint", "c_density", "c_persistence", "c_peak"] as const).map((k, i) => ({
    label: COMPONENT_LABELS[k],
    value: item[k] as number,
    color: rampCss([0.85, 0.7, 0.55, 0.4, 0.95][i]),
  }));

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="label">Selected cell</span>
        <button style={{ padding: "2px 8px", fontSize: 11 }} onClick={onBack}>← list</button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "6px 0 2px" }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{item.police_station ?? "Unattributed"}</span>
        <span className="num" style={{ fontSize: 22, fontWeight: 700, color: rampCss(item.cis / max) }}>
          {item.cis.toFixed(1)}
        </span>
      </div>
      <div className="num" style={{ fontSize: 10.5, color: "var(--fg-2)", marginBottom: 10 }}>
        {item.h3} · {fmt(item.incidents)} incidents · {fmt(item.distinct_vehicles)} vehicles
      </div>

      <div className="label" style={{ marginBottom: 4 }}>CIS components</div>
      <ComponentBars parts={parts} max={Math.max(...parts.map((p) => p.value), 1)} />

      <div className="divider" />
      <KV k="Enforcement gap" v={item.gap === null ? "—" : item.gap.toFixed(2)} />
      <KV k="Validation latency (median)" v={item.median_validation_latency_h ? `${fmt(item.median_validation_latency_h, 1)} h` : "—"} />
      <KV k="Cases processed" v={item.validation_rate !== null ? `${Math.round(item.validation_rate * 100)}%` : "—"} />

      {fc && (
        <>
          <div className="divider" />
          <div className="label" style={{ marginBottom: 4 }}>Next-day forecast</div>
          <KV k="Predicted violations" v={fc.forecast.forecast_next_day.toFixed(1)} />
          <KV k="Recent 7-day mean" v={fc.forecast.recent_mean_7d.toFixed(1)} />
          <div className="num" style={{ fontSize: 10, color: "var(--fg-2)", marginTop: 4 }}>
            Model MAE {fc.backtest.mae.toFixed(2)} · {(fc.backtest.skill_vs_naive * 100).toFixed(0)}% better than persistence
          </div>
        </>
      )}

      <div className="divider" />
      <div style={{ fontSize: 11.5, color: "var(--fg-1)", lineHeight: 1.5 }}>
        {recommend(item)}
      </div>
    </div>
  );
}
