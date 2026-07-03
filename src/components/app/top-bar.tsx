"use client";
import { Link } from "@/i18n/routing";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { PrivacyPill } from "@/components/ui/privacy-pill";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 gc-glass border-x-0 border-t-0">
      <div className="container flex h-14 items-center justify-between gap-2">
        <Link href="/" aria-label="GreeCheck" className="gc-pressable">
          <Logo size={32} withWordmark />
        </Link>
        <div className="flex items-center gap-1">
          <PrivacyPill className="hidden sm:inline-flex" />
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
