import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Compass, BookOpenText, ChevronRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";
import type { FilterLocale } from "@/types/filters";
import { buildPageMetadata } from "@/lib/seo";
import { INTENT_PRESETS } from "@/domains/search/intents";
import { PageHeading } from "@/components/app/page-heading";
import { GreeCard } from "@/components/system/gree-card";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale as Locale, "/discover", "discover");
}

const CATEGORY_KEYS = ["breakfast", "snacks", "drinks", "dairy", "cereals", "sauces"] as const;

export default async function DiscoverPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("discover");
  const ts = await getTranslations("search");
  const fl = locale as FilterLocale;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeading title={t("title")} />
      <p className="flex items-start gap-2 px-1 text-sm leading-relaxed text-muted">
        <Compass className="mt-0.5 h-4 w-4 shrink-0 text-natural-strong" aria-hidden />
        {t("intro")}
      </p>

      {/* Intent presets — server-rendered, indexable links into guided search. */}
      <section>
        <h2 className="mb-3 flex items-center gap-1.5 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
          <Sparkles className="h-4 w-4 text-natural-strong" aria-hidden /> {ts("presetsTitle")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {INTENT_PRESETS.map((p) => (
            <Link
              key={p.id}
              href={`/search?q=${encodeURIComponent(p.query[fl])}`}
              className="gc-pressable rounded-2xl border border-line bg-surface px-3 py-2 text-sm font-semibold hover:border-natural/40"
            >
              {p.label[fl]}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wide text-muted">{t("categoriesTitle")}</h2>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORY_KEYS.map((key) => (
            <Link key={key} href={`/search?q=${encodeURIComponent(t(`categories.${key}`))}`} className="block">
              <GreeCard className="gc-pressable flex items-center justify-between p-4">
                <span className="text-sm font-semibold">{t(`categories.${key}`)}</span>
                <ChevronRight className="h-4 w-4 text-muted rtl:rotate-180" aria-hidden />
              </GreeCard>
            </Link>
          ))}
        </div>
      </section>

      <Link href="/methodology" className="block">
        <GreeCard className="gc-pressable flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-natural/10 text-natural-strong">
            <BookOpenText className="h-5 w-5" aria-hidden />
          </span>
          <span className="flex-1 text-sm font-semibold">{t("methodologyCta")}</span>
          <ChevronRight className="h-4 w-4 text-muted rtl:rotate-180" aria-hidden />
        </GreeCard>
      </Link>
    </div>
  );
}
