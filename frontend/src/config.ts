// Frontend runtime configuration. The impact ramp mirrors the inferno-style
// scale defined in theme.css; CIS legend breaks come from the API (meta), never
// hardcoded here.

import type { StyleSpecification } from "maplibre-gl";

export const API_BASE = import.meta.env.VITE_API_BASE ?? "";

// Free, key-less raster basemap (CARTO dark). No paid API required to run.
export const BASEMAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#0d1013" } },
    { id: "carto", type: "raster", source: "carto", paint: { "raster-opacity": 0.55 } },
  ],
};

export const INITIAL_VIEW = {
  longitude: 77.59,
  latitude: 12.97,
  zoom: 11,
  pitch: 0,
  bearing: 0,
};

// Inferno-style impact ramp as RGB stops (0..1 normalised CIS position).
export const IMPACT_RAMP: [number, [number, number, number]][] = [
  [0.0, [27, 17, 53]],
  [0.2, [74, 16, 121]],
  [0.4, [140, 35, 105]],
  [0.6, [196, 60, 78]],
  [0.75, [237, 105, 37]],
  [0.9, [252, 181, 25]],
  [1.0, [246, 242, 155]],
];

export function rampColor(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  for (let i = 1; i < IMPACT_RAMP.length; i++) {
    const [p1, c1] = IMPACT_RAMP[i];
    const [p0, c0] = IMPACT_RAMP[i - 1];
    if (x <= p1) {
      const f = (x - p0) / (p1 - p0 || 1);
      return [
        Math.round(c0[0] + f * (c1[0] - c0[0])),
        Math.round(c0[1] + f * (c1[1] - c0[1])),
        Math.round(c0[2] + f * (c1[2] - c0[2])),
      ];
    }
  }
  return IMPACT_RAMP[IMPACT_RAMP.length - 1][1];
}

export const rampCss = (t: number) => {
  const [r, g, b] = rampColor(t);
  return `rgb(${r},${g},${b})`;
};

export const COMPONENT_LABELS: Record<string, string> = {
  c_severity: "Severity",
  c_footprint: "Vehicle footprint",
  c_density: "Density",
  c_persistence: "Persistence",
  c_peak: "Peak pressure",
};
