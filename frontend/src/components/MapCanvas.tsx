import { useMemo, useState } from "react";
import { Map } from "react-map-gl/maplibre";
import { DeckGLOverlay } from "./DeckOverlay";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { useQuery } from "@tanstack/react-query";
import { api, type HexCell } from "../api";
import { BASEMAP_STYLE, INITIAL_VIEW, rampColor, rampCss } from "../config";
import { useApp } from "../state";

export function MapCanvas({ topCis }: { topCis: number }) {
  const { filters, res, setRes, selectedHex, setSelectedHex } = useApp();
  const [hover, setHover] = useState<{ x: number; y: number; o: HexCell } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["hexes", filters, res],
    queryFn: () => api.hexes(filters, res),
  });

  const cells = data?.cells ?? [];
  const cisVals = cells.map((c) => c.cis).filter((v) => Number.isFinite(v));
  const maxCis = Math.max(Number.isFinite(topCis) ? topCis : 0, ...cisVals, 1);

  const layer = useMemo(
    () =>
      new H3HexagonLayer<HexCell>({
        id: "cis",
        data: cells,
        getHexagon: (d) => d.h3,
        extruded: false,
        stroked: true,
        filled: true,
        getFillColor: (d) => {
          const [r, g, b] = rampColor(d.cis / maxCis);
          return [r, g, b, 165];
        },
        getLineColor: (d) =>
          d.h3 === selectedHex ? [78, 201, 212, 255] : [0, 0, 0, 40],
        lineWidthUnits: "pixels",
        getLineWidth: (d) => (d.h3 === selectedHex ? 2.5 : 0.5),
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 40],
        onClick: (info) => info.object && setSelectedHex(info.object.h3),
        onHover: (info) =>
          setHover(info.object ? { x: info.x, y: info.y, o: info.object } : null),
        updateTriggers: { getLineColor: selectedHex, getLineWidth: selectedHex, getFillColor: maxCis },
      }),
    [cells, maxCis, selectedHex, setSelectedHex],
  );

  return (
    <div className="canvas-wrap">
      <Map
        initialViewState={INITIAL_VIEW}
        mapStyle={BASEMAP_STYLE}
        attributionControl={{ compact: true }}
      >
        <DeckGLOverlay layers={[layer]} interleaved={false} />
      </Map>

      {/* resolution switch */}
      <div style={{ position: "absolute", top: 12, left: 14, zIndex: 5, display: "flex", gap: 4 }}>
        {[8, 9, 10].map((r) => (
          <button key={r} className={r === res ? "active" : ""} onClick={() => setRes(r)}>
            H3·{r}
          </button>
        ))}
      </div>

      {isLoading && (
        <div style={{ position: "absolute", top: 12, right: 14, zIndex: 5 }}
             className="label">computing impact…</div>
      )}

      {/* legend */}
      <div className="legend">
        <div className="label">Congestion Impact Score</div>
        <div className="ramp" style={{
          background: `linear-gradient(90deg, ${[0, .2, .4, .6, .75, .9, 1].map((t) => rampCss(t)).join(",")})`,
        }} />
        <div className="scale">
          <span className="num">0</span>
          <span className="num">{Math.round(maxCis / 2)}</span>
          <span className="num">{Math.round(maxCis)}</span>
        </div>
      </div>

      {hover && (
        <div className="tooltip-box" style={{
          position: "absolute", left: hover.x + 12, top: hover.y + 12, zIndex: 9, pointerEvents: "none",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 4 }}>
            <span className="label" style={{ textTransform: "none" }}>CIS</span>
            <span className="num" style={{ fontWeight: 600, color: rampCss(hover.o.cis / maxCis) }}>
              {hover.o.cis.toFixed(1)}
            </span>
          </div>
          <div className="num" style={{ fontSize: 10.5, color: "var(--fg-2)" }}>
            {hover.o.incidents.toLocaleString()} incidents · {hover.o.active_days} active days
          </div>
          <div style={{ marginTop: 6 }}>
            {[
              ["Severity", hover.o.c_severity],
              ["Footprint", hover.o.c_footprint],
              ["Density", hover.o.c_density],
              ["Persistence", hover.o.c_persistence],
              ["Peak", hover.o.c_peak],
            ].map(([k, v]) => (
              <div key={k as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ color: "var(--fg-2)" }}>{k}</span>
                <span className="num">{(v as number).toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
