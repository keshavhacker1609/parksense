import { API_BASE } from "./config";

export interface NameCount { name: string; count: number; }

export interface Meta {
  date_range: { start: string; end: string; timezone: string };
  totals: {
    incidents: number; violations: number; distinct_vehicles: number;
    distinct_stations: number; distinct_cells_r9: number;
  };
  peak_hours: number[];
  h3_resolution_default: number;
  h3_resolutions_allowed: number[];
  violation_types: NameCount[];
  vehicle_types: NameCount[];
  stations: NameCount[];
  validation_statuses: NameCount[];
  cis_weights: Record<string, number>;
  severity_table: Record<string, number>;
  cis_quantile_breaks: number[];
  top_cell_cis: number;
  forecast_backtest: Backtest;
}

export interface Backtest {
  test_days: number; n_cells: number; mae: number;
  mae_naive_persistence: number; skill_vs_naive: number;
  mape_pct: number; split_date: string;
}

export interface HexCell {
  h3: string; incidents: number; distinct_vehicles: number;
  active_days: number; lat: number; lon: number; confidence: number;
  cis: number; c_severity: number; c_footprint: number; c_density: number;
  c_persistence: number; c_peak: number;
}

export interface PriorityItem extends HexCell {
  police_station: string | null;
  median_validation_latency_h: number | null;
  gap: number | null; under_enforced: boolean | null;
  enforcement_score: number | null; validation_rate: number | null;
  rejection_rate: number | null;
}

export interface Station {
  police_station: string; incidents: number; impact: number;
  median_validation_latency_h: number | null; validation_rate: number;
  approval_rate: number; rejection_rate: number; enforcement_score: number;
  gap: number; impact_pct: number; perf_pct: number; under_enforced: boolean;
}

export interface WatchZone {
  h3: string; z_score: number; baseline_mean: number;
  recent_mean: number; cis: number;
}

export interface Forecast {
  cell: string;
  forecast: { h3: string; as_of: string; forecast_next_day: number; recent_mean_7d: number };
  backtest: Backtest;
}

export interface Filters {
  from?: string; to?: string;
  violation: string[]; vehicle: string[]; station: string[];
}

function qs(params: Record<string, string | string[] | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
    else p.append(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`);
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

const filterParams = (f: Filters) => ({
  from: f.from, to: f.to,
  violation: f.violation, vehicle: f.vehicle, station: f.station,
});

export const api = {
  meta: () => get<Meta>("/api/v1/meta"),
  hexes: (f: Filters, res: number, limit = 6000) =>
    get<{ resolution: number; cells: HexCell[] }>(
      `/api/v1/hexes${qs({ ...filterParams(f), res, limit })}`),
  priority: (limit = 25) =>
    get<{ items: PriorityItem[] }>(`/api/v1/hotspots/priority${qs({ limit })}`),
  gap: () => get<{ stations: Station[] }>("/api/v1/enforcement/gap"),
  anomalies: () => get<{ watch_zones: WatchZone[] }>("/api/v1/anomalies"),
  forecast: (cell: string) => get<Forecast>(`/api/v1/forecast${qs({ cell })}`),
  trends: (groupBy: string, f: Filters) =>
    get<{ group_by: string; series: { key: string | number; count: number }[] }>(
      `/api/v1/trends${qs({ group_by: groupBy, ...filterParams(f) })}`),
  latency: (f: Filters) =>
    get<{ buckets: { bucket: number; count: number }[] }>(
      `/api/v1/enforcement/latency${qs({ from: f.from, to: f.to, station: f.station })}`),
};
