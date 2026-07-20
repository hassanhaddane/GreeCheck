import { useTranslations } from "next-intl";
import { ScanLine } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { GlobalSearch } from "./global-search";
import { MoreMenu } from "./more-menu";
import { PrivacyPill } from "@/components/ui/privacy-pill";

/**
 * Top bar — deliberately minimal on mobile (brand + settings/more), fuller on
 * desktop (global search, explicit Scan, locale). Light-first premium chrome.
 */
export function TopBar() {
  const t = useTranslations("nav");
  return (
    <header className="sticky top-0 z-40 gc-glass border-x-0 border-t-0 pt-[env(safe-area-inset-top)]">
      <div className="container flex h-14 items-center gap-2">
        <Link href="/" aria-label="GreeCheck" className="gc-pressable shrink-0">
          <Logo size={32} withWordmark />
        </Link>
        <div className="flex-1" />
        <GlobalSearch />
        {/* Explicit desktop access to Scan */}
        <Link
          href="/scan"
          className="gc-pressable hidden h-10 shrink-0 items-center gap-1.5 rounded-xl bg-surface-2 px-3 text-sm font-semibold md:inline-flex"
        >
          <ScanLine className="h-4 w-4 text-natural-strong" aria-hidden /> {t("scanCta")}
        </Link>
        <PrivacyPill className="hidden lg:inline-flex" />
        <div className="hidden md:block">
          <LanguageSwitcher />
        </div>
        <MoreMenu />
      </div>
    </header>
  );
}
