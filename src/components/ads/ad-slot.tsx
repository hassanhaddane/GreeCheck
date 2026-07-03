"use client";
import { useTranslations } from "next-intl";
import { Megaphone } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useConsentStore } from "@/stores/consent-store";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils/cn";

/**
 * Discrete, premium ad placeholder. Reflects the current (local) ad mode and
 * links to the privacy page. No tracking SDK is loaded here in V1.
 */
export function AdSlot({ variant = "banner", className }: { variant?: "banner" | "inline"; className?: string }) {
  const t = useTranslations("ads");
  const mounted = useMounted();
  const adMode = useConsentStore((s) => s.adMode);
  const modeLabel = mounted && adMode === "personalized" ? t("personalized") : t("nonPersonalized");

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-dashed border-line bg-surface-2/40",
        variant === "banner" ? "h-24" : "h-16",
        className
      )}
      aria-label={t("label")}
    >
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
