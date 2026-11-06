import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Calculator, ShieldQuestion, Scale, Lock, ExternalLink } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";
import { SourceDetails } from "@/components/app/source-details";
import { Link } from "@/i18n/routing";
import { PageHeading } from "@/components/app/page-heading";
import { METHODOLOGY_VERSION, METHODOLOGY_UPDATED_AT, NUTRI_SCORE_REFERENCE } from "@greecheck/domain/scoring/methodology";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale as Locale, "/methodology", "methodology");
}

const RULE_KEYS = ["formula", "anchors", "missing", "axes"] as const;

export default async function MethodologyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("methodology");
  const score = await getTranslations("score");

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
          <p className="text-xs font-medium text-muted">{METHODOLOGY_VERSION} · <time dateTime={METHODOLOGY_UPDATED_AT}>{METHODOLOGY_UPDATED_AT}</time></p>
          <p className="text-sm leading-relaxed text-muted">{t("gs3Body")}</p>
          <p className="text-sm leading-relaxed text-muted">{t("gs3Limit")}</p>
          <p className="text-sm leading-relaxed text-muted">{t("proprietary")}</p>
          <a href={NUTRI_SCORE_REFERENCE} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-natural-strong underline">
            {score("gs3OfficialMethod")} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
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
                {t(`gs3Rules.${key}`)}
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
          <p className="text-sm leading-relaxed text-muted">{t("gs3Confidence")}</p>
        </GreeCardContent>
      </GreeCard>

      <SourceDetails />
      <Link href="/sources" className="inline-flex min-h-11 items-center text-sm font-semibold text-natural-strong underline">{t("sourcesTitle")}</Link>

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
