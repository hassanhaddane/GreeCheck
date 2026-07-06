"use client";
import * as React from "react";

type Theme = "light" | "dark" | "system";
interface Ctx { theme: Theme; setTheme: (t: Theme) => void; resolved: "light" | "dark"; }
const ThemeContext = React.createContext<Ctx | null>(null);

const STORAGE_KEY = "greecheck.theme";

/* ----------------------------------------------------------------------------
 * Theme lives in the browser only (localStorage + prefers-color-scheme).
 * Exposed through useSyncExternalStore so reads are SSR-safe and never require
 * a setState-in-effect. getSnapshot returns primitives (stable by value).
 * ------------------------------------------------------------------------- */
const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) cb(); };
  mq?.addEventListener("change", cb);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    mq?.removeEventListener("change", cb);
    window.removeEventListener("storage", onStorage);
  };
}

function readStored(): Theme {
  if (typeof window === "undefined") return "system";
  return ((localStorage.getItem(STORAGE_KEY) as Theme) || "system");
}
function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}
function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "dark" || (theme === "system" && systemPrefersDark()) ? "dark" : "light";
}

const getThemeSnapshot = () => readStored();
const getResolvedSnapshot = () => resolveTheme(readStored());
const getThemeServerSnapshot = () => "system" as const;
const getResolvedServerSnapshot = () => "light" as const;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(subscribe, getThemeSnapshot, getThemeServerSnapshot);
  const resolved = React.useSyncExternalStore(subscribe, getResolvedSnapshot, getResolvedServerSnapshot);

  // Reflect the resolved theme onto the <html> element (external system, not state).
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  const setTheme = React.useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    emit();
  }, []);

  const value = React.useMemo(() => ({ theme, setTheme, resolved }), [theme, setTheme, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
