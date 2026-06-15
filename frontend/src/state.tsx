import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Filters } from "./api";

export type View = "command" | "analytics";

interface AppState {
  view: View;
  setView: (v: View) => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  toggle: (key: "violation" | "vehicle" | "station", value: string) => void;
  resetFilters: () => void;
  res: number;
  setRes: (r: number) => void;
  selectedHex: string | null;
  setSelectedHex: (h: string | null) => void;
  hoveredHex: string | null;
  setHoveredHex: (h: string | null) => void;
}

const emptyFilters: Filters = { violation: [], vehicle: [], station: [] };

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("command");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [res, setRes] = useState(9);
  const [selectedHex, setSelectedHex] = useState<string | null>(null);
  const [hoveredHex, setHoveredHex] = useState<string | null>(null);

  const value = useMemo<AppState>(() => ({
    view, setView, filters, setFilters, res, setRes,
    selectedHex, setSelectedHex, hoveredHex, setHoveredHex,
    resetFilters: () => setFilters(emptyFilters),
    toggle: (key, v) =>
      setFilters((f) => {
        const cur = f[key];
        const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
        return { ...f, [key]: next };
      }),
  }), [view, filters, res, selectedHex, hoveredHex]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}
