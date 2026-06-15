import { rampCss } from "../config";

export const fmt = (n: number | null | undefined, d = 0) =>
  n === null || n === undefined || Number.isNaN(n)
    ? "—"
    : n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });

export function CisBadge({ value, max }: { value: number; max: number }) {
  return (
    <span className="num cis" style={{ color: rampCss(value / max) }}>
      {value.toFixed(1)}
    </span>
  );
}

export function ComponentBars({
  parts, max,
}: { parts: { label: string; value: number; color: string }[]; max: number }) {
  return (
    <div>
      {parts.map((p) => (
        <div className="bar-row" key={p.label}>
          <span className="label" style={{ textTransform: "none" }}>{p.label}</span>
          <span className="bar-track">
            <span
              className="bar-fill"
              style={{ width: `${Math.min(100, (p.value / max) * 100)}%`, background: p.color }}
            />
          </span>
          <span className="num" style={{ fontSize: 11, textAlign: "right", color: "var(--fg-1)" }}>
            {p.value.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Minimal inline SVG sparkline / bar series — no chart lib needed for tiny views.
export function MiniBars({
  values, height = 34, color = "var(--accent)", labels,
}: { values: number[]; height?: number; color?: string; labels?: string[] }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const w = 100 / values.length;
  return (
    <svg width="100%" height={height} preserveAspectRatio="none" viewBox={`0 0 100 ${height}`}>
      {values.map((v, i) => {
        const h = (v / max) * (height - 2);
        return (
          <rect
            key={i}
            x={i * w + w * 0.12}
            y={height - h}
            width={w * 0.76}
            height={h}
            fill={color}
            opacity={0.85}
          >
            {labels && <title>{`${labels[i]}: ${v.toLocaleString()}`}</title>}
          </rect>
        );
      })}
    </svg>
  );
}

export function KV({ k, v, mono = true }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span className={`v ${mono ? "num" : ""}`}>{v}</span>
    </div>
  );
}
