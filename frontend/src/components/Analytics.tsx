import ReactECharts from "echarts-for-react";
import { useQuery } from "@tanstack/react-query";
import { api, type Meta } from "../api";
import { useApp } from "../state";

const AXIS = "#6f7b87";
const GRID = "#232b33";
const INK = "#aab4bf";

const base = (over: object) => ({
  backgroundColor: "transparent",
  textStyle: { fontFamily: "Inter, sans-serif", color: INK, fontSize: 11 },
  grid: { left: 44, right: 18, top: 26, bottom: 30, containLabel: false },
  ...over,
});

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
        {sub && <div className="label" style={{ textTransform: "none", marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export function Analytics({ meta }: { meta: Meta }) {
  const { filters } = useApp();
  const f = filters;

  const hour = useQuery({ queryKey: ["t", "hour", f], queryFn: () => api.trends("hour", f) });
  const dow = useQuery({ queryKey: ["t", "dow", f], queryFn: () => api.trends("dow", f) });
  const month = useQuery({ queryKey: ["t", "month", f], queryFn: () => api.trends("month", f) });
  const veh = useQuery({ queryKey: ["t", "vehicle", f], queryFn: () => api.trends("vehicle", f) });
  const viol = useQuery({ queryKey: ["t", "violation", f], queryFn: () => api.trends("violation", f) });
  const lat = useQuery({ queryKey: ["lat", f], queryFn: () => api.latency(f) });

  const peak = new Set(meta.peak_hours);
  const hourData = hour.data?.series ?? [];

  return (
    <div style={{ overflowY: "auto", padding: 16, display: "grid", gap: 14, gridTemplateColumns: "1fr 1fr" }}>
      <div style={{ gridColumn: "1 / -1" }}>
        <Panel title="Hourly violation pressure" sub={`Peak windows (derived): ${meta.peak_hours.map((h) => `${h}:00`).join(", ")} · ${meta.date_range.timezone}`}>
          <ReactECharts style={{ height: 220 }} option={base({
            tooltip: { trigger: "axis", backgroundColor: "#14181d", borderColor: "#3a454f", textStyle: { color: "#e8edf2" } },
            xAxis: {
              type: "category", data: hourData.map((d) => `${d.key}`),
              axisLine: { lineStyle: { color: GRID } }, axisLabel: { color: AXIS },
            },
            yAxis: {
              type: "value", splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: AXIS },
            },
            series: [{
              type: "bar", data: hourData.map((d) => ({
                value: d.count,
                itemStyle: { color: peak.has(Number(d.key)) ? "#e8a13a" : "#3d5a63" },
              })),
              barCategoryGap: "28%",
            }],
          })} />
        </Panel>
      </div>

      <Panel title="Day-of-week distribution">
        <ReactECharts style={{ height: 200 }} option={base({
          tooltip: { trigger: "axis", backgroundColor: "#14181d", borderColor: "#3a454f", textStyle: { color: "#e8edf2" } },
          xAxis: { type: "category", data: (dow.data?.series ?? []).map((d) => DOW[Number(d.key)] ?? d.key), axisLine: { lineStyle: { color: GRID } }, axisLabel: { color: AXIS } },
          yAxis: { type: "value", splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: AXIS } },
          series: [{ type: "bar", data: (dow.data?.series ?? []).map((d) => d.count), itemStyle: { color: "#4ec9d4" }, barCategoryGap: "40%" }],
        })} />
      </Panel>

      <Panel title="Monthly trend">
        <ReactECharts style={{ height: 200 }} option={base({
          tooltip: { trigger: "axis", backgroundColor: "#14181d", borderColor: "#3a454f", textStyle: { color: "#e8edf2" } },
          xAxis: { type: "category", data: (month.data?.series ?? []).map((d) => d.key), axisLine: { lineStyle: { color: GRID } }, axisLabel: { color: AXIS } },
          yAxis: { type: "value", splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: AXIS } },
          series: [{ type: "line", smooth: true, data: (month.data?.series ?? []).map((d) => d.count), itemStyle: { color: "#e8a13a" }, areaStyle: { color: "rgba(232,161,58,0.12)" }, symbol: "circle", symbolSize: 5 }],
        })} />
      </Panel>

      <Panel title="Violation composition">
        <ReactECharts style={{ height: 230 }} option={base({
          grid: { left: 8, right: 18, top: 8, bottom: 8, containLabel: true },
          tooltip: { trigger: "axis", backgroundColor: "#14181d", borderColor: "#3a454f", textStyle: { color: "#e8edf2" } },
          xAxis: { type: "value", splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: AXIS } },
          yAxis: { type: "category", inverse: true, data: (viol.data?.series ?? []).slice(0, 8).reverse().map((d) => String(d.key)), axisLine: { lineStyle: { color: GRID } }, axisLabel: { color: AXIS, fontSize: 10, width: 130, overflow: "truncate" } },
          series: [{ type: "bar", data: (viol.data?.series ?? []).slice(0, 8).reverse().map((d) => d.count), itemStyle: { color: "#8c5acb" }, barCategoryGap: "35%" }],
        })} />
      </Panel>

      <Panel title="Vehicle composition">
        <ReactECharts style={{ height: 230 }} option={base({
          grid: { left: 8, right: 18, top: 8, bottom: 8, containLabel: true },
          tooltip: { trigger: "axis", backgroundColor: "#14181d", borderColor: "#3a454f", textStyle: { color: "#e8edf2" } },
          xAxis: { type: "value", splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: AXIS } },
          yAxis: { type: "category", inverse: true, data: (veh.data?.series ?? []).slice(0, 8).reverse().map((d) => String(d.key)), axisLine: { lineStyle: { color: GRID } }, axisLabel: { color: AXIS, fontSize: 10 } },
          series: [{ type: "bar", data: (veh.data?.series ?? []).slice(0, 8).reverse().map((d) => d.count), itemStyle: { color: "#4ec9d4" }, barCategoryGap: "35%" }],
        })} />
      </Panel>

      <div style={{ gridColumn: "1 / -1" }}>
        <Panel title="Enforcement validation latency" sub="Hours from violation logged to validation decision (binned, 0–240 h)">
          <ReactECharts style={{ height: 180 }} option={base({
            tooltip: { trigger: "axis", backgroundColor: "#14181d", borderColor: "#3a454f", textStyle: { color: "#e8edf2" } },
            xAxis: { type: "category", data: (lat.data?.buckets ?? []).map((b) => `${(b.bucket - 1) * 10}`), axisLine: { lineStyle: { color: GRID } }, axisLabel: { color: AXIS } },
            yAxis: { type: "value", splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: AXIS } },
            series: [{ type: "bar", data: (lat.data?.buckets ?? []).map((b) => b.count), itemStyle: { color: "#3d5a63" }, barCategoryGap: "12%" }],
          })} />
        </Panel>
      </div>
    </div>
  );
}
