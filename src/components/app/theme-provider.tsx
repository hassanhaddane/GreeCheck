"use client";
import * as React from "react";

type Theme = "light" | "dark" | "system";
interface Ctx { theme: Theme; setTheme: (t: Theme) => void; resolved: "light" | "dark"; }
const ThemeContext = React.createContext<Ctx | null>(null);

const STORAGE_KEY = "greecheck.theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolved, setResolved] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme) || "system";
    setThemeState(stored);
  }, []);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const isDark = theme === "dark" || (theme === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", isDark);
      setResolved(isDark ? "dark" : "light");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = (t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  };

  return <ThemeContext.Provider value={{ theme, setTheme, resolved }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
