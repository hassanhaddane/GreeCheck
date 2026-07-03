"use client";
import { useTranslations } from "next-intl";
import { Megaphone } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useConsentStore } from "@/stores/consent-store";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils/cn";

/**
 * AdSlotPremium — discreet, brand-consistent ad placeholder.
 * Soft tinted surface instead of a dashed grey box; reflects the current
 * (local) ad mode and links to the privacy page. No tracking SDK in V1.
 */
export function AdSlot({ variant = "banner", className }: { variant?: "banner" | "inline"; className?: string }) {
  const t = useTranslations("ads");
  const mounted = useMounted();
  const adMode = useConsentStore((s) => s.adMode);
  const modeLabel = mounted && adMode === "personalized" ? t("personalized") : t("nonPersonalized");

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line/80 bg-gradient-to-br from-surface to-surface-2 shadow-soft",
        variant === "banner" ? "h-24" : "h-16",
        className
      )}
      aria-label={t("label")}
    >
      <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-natural/10 blur-2xl" />
      <span className="absolute start-3 top-2.5 rounded-full bg-surface-2 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-muted">
        {t("sponsored")}
      </span>
      <div className="flex h-full items-center justify-center gap-2 text-xs font-medium text-muted">
        <Megaphone className="h-4 w-4" /> {t("label")}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-3 py-1 text-[0.6rem] text-muted/70">
        <span>{modeLabel}</span>
        <Link href="/privacy" className="underline underline-offset-2">{t("why")}</Link>
      </div>
    </div>
  );
}
