"use client";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";

export function TopBar() {
  const t = useTranslations("app");
  return (
    <header className="sticky top-0 z-40 gc-glass">
      <div className="container flex h-14 items-center justify-between gap-2">
        <Link href="/" aria-label="GreeCheck" className="gc-pressable">
          <Logo size={32} withWordmark />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/privacy"
            className="hidden items-center gap-1.5 rounded-full bg-natural/10 px-3 py-1.5 text-xs font-medium text-natural sm:flex"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("privacyBadge")}
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
