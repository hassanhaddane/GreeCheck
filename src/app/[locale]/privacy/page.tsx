import type { Metadata } from "next";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ShieldCheck, UserX, HardDrive, Database, EyeOff,
  History, Heart, ShoppingBasket, SlidersHorizontal, MapPin, ExternalLink, BadgeX
} from "lucide-react";
import { PageHeading } from "@/components/app/page-heading";
import { GreeButton } from "@/components/system/gree-button";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale as Locale, "/privacy", "privacy");
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");

  const points = [
    { icon: UserX, label: t("noAccount") },
    { icon: HardDrive, label: t("localOnly") },
    { icon: Database, label: t("attribution") }
  ];

  const localItems = [
    { icon: History, label: t("localHistory") },
    { icon: Heart, label: t("localFavorites") },
    { icon: ShoppingBasket, label: t("localBasket") },
    { icon: SlidersHorizontal, label: t("localPrefs") }
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeading title={t("title")} />

      {/* Statement */}
      <GreeCard variant="deep" glow className="gc-shine">
        <GreeCardContent className="relative flex flex-col items-center gap-4 py-8 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 backdrop-blur">
            <ShieldCheck className="h-7 w-7 text-neon" />
          </span>
          <p className="max-w-md text-sm leading-relaxed text-white/85">{t("statement")}</p>
          <p className="max-w-md text-xs leading-relaxed text-white/60">{t("noHealthServer")}</p>
        </GreeCardContent>
      </GreeCard>

      {/* Key points */}
      <div className="grid gap-3 sm:grid-cols-3">
        {points.map((p, i) => {
          const Icon = p.icon;
          return (
            <GreeCard key={i} className="p-5">
              <Icon className="h-6 w-6 text-natural-strong" />
              <p className="mt-3 text-sm font-medium">{p.label}</p>
            </GreeCard>
          );
        })}
      </div>

      {/* What stays on-device */}
      <GreeCard>
        <GreeCardContent className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("localTitle")}</h2>
          {localItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-natural/10 text-natural-strong">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="pt-1.5 text-sm leading-snug text-ink/90">{item.label}</p>
              </div>
            );
          })}
        </GreeCardContent>
      </GreeCard>

      {/* Geolocation */}
      <GreeCard className="flex items-start gap-3 p-5">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-natural-strong" />
        <div>
          <p className="text-sm font-semibold">{t("geoTitle")}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t("geoBody")}</p>
        </div>
      </GreeCard>

      {/* No internal tracking */}
      <GreeCard className="flex items-start gap-3 border-natural/25 bg-natural/5 p-5">
        <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-natural-strong" />
        <div>
          <p className="text-sm font-semibold">{t("noTracking")}</p>
          <p className="mt-1 text-sm text-muted">{t("noTrackingBody")}</p>
        </div>
      </GreeCard>

      <GreeCard className="flex items-start gap-3 p-5">
        <BadgeX className="mt-0.5 h-5 w-5 shrink-0 text-natural-strong" aria-hidden />
        <div>
          <p className="text-sm font-semibold">{t("noAds")}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t("noAdsBody")}</p>
        </div>
      </GreeCard>

      {/* Open Food Facts contribution + attribution */}
      <GreeCard>
        <GreeCardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-5 w-5 shrink-0 text-natural-strong" />
            <div>
              <p className="text-sm font-semibold">{t("contributeTitle")}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t("contributeBody")}</p>
            </div>
          </div>
          <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer" className="inline-block">
            <GreeButton variant="soft" size="sm"><ExternalLink className="h-4 w-4" /> {t("contributeCta")}</GreeButton>
          </a>
        </GreeCardContent>
      </GreeCard>

      <p className="px-1 text-center text-xs text-muted">{t("attribution")}</p>
    </div>
  );
}
