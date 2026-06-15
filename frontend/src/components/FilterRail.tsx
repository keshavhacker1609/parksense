import type { Meta } from "../api";
import { useApp } from "../state";

function ChipGroup({
  title, items, selected, onToggle, max = 12,
}: {
  title: string;
  items: { name: string; count: number }[];
  selected: string[];
  onToggle: (v: string) => void;
  max?: number;
}) {
  const shown = items.slice(0, max);
  return (
    <div className="fgroup">
      <span className="label">{title}</span>
      <div className="chiplist">
        {shown.map((it) => (
          <span
            key={it.name}
            className={`chip ${selected.includes(it.name) ? "on" : ""}`}
            onClick={() => onToggle(it.name)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle(it.name)}
          >
            {it.name}
            <span className="c num">{it.count.toLocaleString("en-IN")}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function FilterRail({ meta }: { meta: Meta }) {
  const { filters, setFilters, toggle, resetFilters } = useApp();
  const dr = meta.date_range;
  const dmin = dr.start.slice(0, 10);
  const dmax = dr.end.slice(0, 10);
  const active =
    filters.violation.length + filters.vehicle.length + filters.station.length +
    (filters.from ? 1 : 0) + (filters.to ? 1 : 0);

  return (
    <aside className="rail">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span className="label">Filters</span>
        {active > 0 && (
          <button onClick={resetFilters} style={{ padding: "2px 8px", fontSize: 11 }}>
            Clear {active}
          </button>
        )}
      </div>

      <div className="fgroup">
        <span className="label">Date range</span>
        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
          <input type="date" min={dmin} max={dmax} value={filters.from?.slice(0, 10) ?? ""}
            onChange={(e) => setFilters({ ...filters, from: e.target.value || undefined })} />
          <input type="date" min={dmin} max={dmax} value={filters.to?.slice(0, 10) ?? ""}
            onChange={(e) => setFilters({ ...filters, to: e.target.value || undefined })} />
        </div>
      </div>

      <ChipGroup title="Violation type" items={meta.violation_types}
        selected={filters.violation} onToggle={(v) => toggle("violation", v)} max={10} />
      <ChipGroup title="Vehicle type" items={meta.vehicle_types}
        selected={filters.vehicle} onToggle={(v) => toggle("vehicle", v)} max={12} />

      <div className="fgroup">
        <span className="label">Police station</span>
        <div style={{ marginTop: 8 }}>
          <select
            value=""
            onChange={(e) => e.target.value && toggle("station", e.target.value)}
          >
            <option value="">Add station…</option>
            {meta.stations.map((s) => (
              <option key={s.name} value={s.name}>{s.name} ({s.count.toLocaleString("en-IN")})</option>
            ))}
          </select>
          {filters.station.length > 0 && (
            <div className="chiplist" style={{ marginTop: 8 }}>
              {filters.station.map((s) => (
                <span key={s} className="chip on" onClick={() => toggle("station", s)}>
                  {s} ×
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
