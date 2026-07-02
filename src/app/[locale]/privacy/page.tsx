"use client";
import { useTranslations } from "next-intl";
import { ShieldCheck, UserX, HardDrive, Database, Megaphone, EyeOff } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { useConsentStore } from "@/stores/consent-store";
import { useMounted } from "@/lib/utils/use-mounted";

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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeading title={t("title")} />

      {/* Statement */}
      <Card className="bg-deep-grad text-white">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 backdrop-blur">
            <ShieldCheck className="h-7 w-7 text-neon" />
          </span>
          <p className="max-w-md text-sm leading-relaxed text-white/85">{t("statement")}</p>
        </CardContent>
      </Card>

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

      {/* OFF attribution */}
      <p className="px-1 text-center text-xs text-muted">{t("attribution")}</p>
    </div>
  );
}
