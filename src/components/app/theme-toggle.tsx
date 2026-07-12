"use client";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { GreeButton } from "@/components/system/gree-button";

export function ThemeToggle() {
  const tc = useTranslations("common");
  const { resolved, setTheme } = useTheme();
  return (
    <GreeButton
      variant="ghost"
      size="icon"
      aria-label={tc("toggleTheme")}
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
    >
      {resolved === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </GreeButton>
  );
}
