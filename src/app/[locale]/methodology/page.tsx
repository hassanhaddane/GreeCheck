import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Calculator, ShieldQuestion, Scale, Database, Lock, ExternalLink } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";
import { PageHeading } from "@/components/app/page-heading";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale as Locale, "/methodology", "methodology");
}

const BUCKET_KEYS = ["nutrition", "processing", "additives", "labels", "goal", "ecology"] as const;
const RULE_KEYS = ["nova", "bio", "halal", "missing"] as const;

export default async function MethodologyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("methodology");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeading title={t("title")} />
      <p className="px-1 text-sm leading-relaxed text-muted">{t("intro")}</p>

      {/* Score composition */}
      <GreeCard id="greescore">
        <GreeCardContent className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Calculator className="h-4 w-4 text-natural-strong" aria-hidden /> {t("scoreTitle")}
          </h2>
          <p className="text-sm leading-relaxed text-muted">{t("scoreBody")}</p>
          <ul className="space-y-2">
            {BUCKET_KEYS.map((key) => (
              <li key={key} className="flex items-start gap-2 text-sm">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-natural" />
                {t(`buckets.${key}`)}
              </li>
            ))}
          </ul>
        </GreeCardContent>
      </GreeCard>

      {/* Fairness rules — covers organic, halal-as-compatibility and missing data */}
      <GreeCard id="rules">
        <GreeCardContent className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Scale className="h-4 w-4 text-natural-strong" aria-hidden /> {t("rulesTitle")}
          </h2>
          <ul className="space-y-2">
            {RULE_KEYS.map((key) => (
              <li key={key} className="flex items-start gap-2 text-sm">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-natural" />
                {t(`rules.${key}`)}
              </li>
            ))}
          </ul>
        </GreeCardContent>
      </GreeCard>

      {/* Confidence */}
      <GreeCard id="confidence">
        <GreeCardContent className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldQuestion className="h-4 w-4 text-natural-strong" aria-hidden /> {t("confidenceTitle")}
          </h2>
          <p className="text-sm leading-relaxed text-muted">{t("confidenceBody")}</p>
        </GreeCardContent>
      </GreeCard>

      {/* Sources */}
      <GreeCard id="sources">
        <GreeCardContent className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Database className="h-4 w-4 text-natural-strong" aria-hidden /> {t("sourcesTitle")}
          </h2>
          <p className="text-sm leading-relaxed text-muted">{t("sourcesBody")}</p>
          <a
            href="https://world.openfoodfacts.org"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-natural-strong underline underline-offset-2"
          >
            Open Food Facts <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </GreeCardContent>
      </GreeCard>

      {/* Privacy note */}
      <GreeCard className="border-natural/25 bg-natural/5">
        <GreeCardContent className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-natural-strong" aria-hidden />
          <p className="text-sm leading-relaxed">{t("privacyBody")}</p>
        </GreeCardContent>
      </GreeCard>
    </div>
  );
}
