import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RefreshCw, WifiOff } from "lucide-react";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function OfflinePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pwa");

  return (
    <div className="grid min-h-[65dvh] place-items-center py-8 text-center">
      <GreeCard className="max-w-sm">
        <GreeCardContent className="flex flex-col items-center gap-4 py-8">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-deep text-neon shadow-raised">
            <WifiOff className="h-7 w-7" aria-hidden />
          </span>
          <div>
            <h1 className="gc-title">{t("offlineTitle")}</h1>
            <p className="gc-body mt-2 text-muted">{t("offlineBody")}</p>
          </div>
          <a href="." className="gc-pressable inline-flex min-h-11 items-center gap-2 rounded-2xl bg-deep px-5 text-sm font-semibold text-white">
            <RefreshCw className="h-4 w-4" aria-hidden /> {t("offlineAction")}
          </a>
        </GreeCardContent>
      </GreeCard>
    </div>
  );
}
