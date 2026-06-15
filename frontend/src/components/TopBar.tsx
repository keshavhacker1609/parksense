import type { Meta } from "../api";
import { useApp } from "../state";
import { fmt } from "./Bits";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function TopBar({ meta }: { meta: Meta }) {
  const { view, setView } = useApp();
  const t = meta.totals;
  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark">ParkSense</span>
        <span className="sub">Parking-Induced Congestion Intelligence · Bengaluru</span>
      </div>

      <div style={{ display: "flex", gap: 26 }}>
        <Metric k="Incidents" v={fmt(t.incidents)} />
        <Metric k="Violations" v={fmt(t.violations)} />
        <Metric k="Impact cells" v={fmt(t.distinct_cells_r9)} />
        <Metric k="Stations" v={fmt(t.distinct_stations)} />
        <Metric k="Window" v={`${fmtDate(meta.date_range.start)} – ${fmtDate(meta.date_range.end)}`} mono={false} />
      </div>

      <div className="viewswitch">
        <button className={view === "command" ? "active" : ""} onClick={() => setView("command")}>Command</button>
        <button className={view === "analytics" ? "active" : ""} onClick={() => setView("analytics")}>Analytics</button>
      </div>
    </header>
  );
}

function Metric({ k, v, mono = true }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="metric">
      <span className={`v ${mono ? "num" : ""}`} style={mono ? {} : { fontSize: 12, fontWeight: 500 }}>{v}</span>
      <span className="k label">{k}</span>
    </div>
  );
}
