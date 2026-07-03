"use client";
import { useTranslations } from "next-intl";
import {
  ShieldCheck, UserX, HardDrive, Database, Megaphone, EyeOff,
  History, Heart, ShoppingBasket, SlidersHorizontal, MapPin, ExternalLink
} from "lucide-react";
import { PageHeading } from "@/components/app/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { PremiumCard } from "@/components/ui/premium-card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { useConsentStore } from "@/stores/consent-store";
import { useMounted } from "@/hooks/use-mounted";

export default function PrivacyPage() {
  const t = useTranslations("privacy");
  const tAds = useTranslations("ads");
  const mounted = useMounted();
  const adMode = useConsentStore((s) => s.adMode);
  const setMode = useConsentStore((s) => s.setMode);

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
      <PremiumCard variant="deep" glow className="gc-shine">
        <CardContent className="relative flex flex-col items-center gap-4 py-8 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 backdrop-blur">
            <ShieldCheck className="h-7 w-7 text-neon" />
          </span>
          <p className="max-w-md text-sm leading-relaxed text-white/85">{t("statement")}</p>
          <p className="max-w-md text-xs leading-relaxed text-white/60">{t("noHealthServer")}</p>
        </CardContent>
      </PremiumCard>

      {/* Key points */}
      <div className="grid gap-3 sm:grid-cols-3">
        {points.map((p, i) => {
          const Icon = p.icon;
          return (
            <Card key={i} className="p-5">
              <Icon className="h-6 w-6 text-natural" />
              <p className="mt-3 text-sm font-medium">{p.label}</p>
            </Card>
          );
        })}
      </div>

      {/* What stays on-device */}
      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("localTitle")}</h2>
          {localItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-natural/10 text-natural">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="pt-1.5 text-sm leading-snug text-ink/90">{item.label}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Geolocation */}
      <Card className="flex items-start gap-3 p-5">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-natural" />
        <div>
          <p className="text-sm font-semibold">{t("geoTitle")}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{t("geoBody")}</p>
        </div>
      </Card>

      {/* No internal tracking */}
      <Card className="flex items-start gap-3 border-natural/25 bg-natural/5 p-5">
        <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-natural" />
        <div>
          <p className="text-sm font-semibold">{t("noTracking")}</p>
          <p className="mt-1 text-sm text-muted">{t("noTrackingBody")}</p>
        </div>
      </Card>

      {/* Ads + consent */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-natural" />
            <div>
              <p className="text-sm font-semibold">{t("adsTitle")}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t("adsBody")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip active={mounted && adMode === "non_personalized"} onClick={() => setMode("non_personalized")}>
              {tAds("keepNonPersonalized")}
            </Chip>
            <Chip active={mounted && adMode === "personalized"} onClick={() => setMode("personalized")}>
              {tAds("acceptPersonalized")}
            </Chip>
          </div>
        </CardContent>
      </Card>

      {/* Open Food Facts contribution + attribution */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-5 w-5 shrink-0 text-natural" />
            <div>
              <p className="text-sm font-semibold">{t("contributeTitle")}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{t("contributeBody")}</p>
            </div>
          </div>
          <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer" className="inline-block">
            <Button variant="soft" size="sm"><ExternalLink className="h-4 w-4" /> {t("contributeCta")}</Button>
          </a>
        </CardContent>
      </Card>

      <p className="px-1 text-center text-xs text-muted">{t("attribution")}</p>
    </div>
  );
}
