import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useApp } from "./state";
import { TopBar } from "./components/TopBar";
import { FilterRail } from "./components/FilterRail";
import { MapCanvas } from "./components/MapCanvas";
import { InsightPanel } from "./components/InsightPanel";
import { Analytics } from "./components/Analytics";

export default function App() {
  const { view } = useApp();
  const { data: meta, isLoading, isError, refetch } = useQuery({
    queryKey: ["meta"], queryFn: () => api.meta(), staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="shell">
        <div className="topbar"><span className="brand"><span className="mark">ParkSense</span></span></div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="label">Loading command console…</span>
        </div>
      </div>
    );
  }

  if (isError || !meta) {
    return (
      <div className="shell">
        <div className="topbar"><span className="brand"><span className="mark">ParkSense</span></span></div>
        <div className="empty" style={{ alignSelf: "center" }}>
          <div style={{ marginBottom: 10 }}>Unable to reach the analytics service.</div>
          <button onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <TopBar meta={meta} />
      {view === "command" ? (
        <div className="workspace">
          <FilterRail meta={meta} />
          <MapCanvas topCis={meta.top_cell_cis} />
          <InsightPanel meta={meta} />
        </div>
      ) : (
        <div className="workspace" style={{ gridTemplateColumns: "248px 1fr" }}>
          <FilterRail meta={meta} />
          <Analytics meta={meta} />
        </div>
      )}
    </div>
  );
}
