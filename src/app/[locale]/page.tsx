import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ScanLine, Search, ShieldCheck, UserX, EyeOff, Database, Trophy,
  ArrowRight, BookOpenText, Swords, ShoppingBasket, Sparkles
} from "lucide-react";
import { Link } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { GreeBadge } from "@/components/system/gree-badge";
import { TrustHalo } from "@/components/system/trust-halo";
import { Logo } from "@/components/app/logo";
import { InstallPrompt } from "@/components/app/install-prompt";
import { DemoJourney, type DemoData } from "@/components/marketing/demo-journey";
import { StaticScoreRing } from "@/components/marketing/static-ring";
import { SearchEntryForm } from "@/components/marketing/search-entry-form";
import { DEMO_GENERIC, DEMO_BETTER, DEMO_MIDDLE, DEMO_CART_BEFORE, DEMO_CART_AFTER } from "@/components/marketing/fixtures";
import { computeGreeScore } from "@/domains/scoring/gree-score";
import { computeBattle } from "@/domains/battle/engine";
import { computeCartScore } from "@/domains/cart/engine";
import { defaultPreferences } from "@/domains/criteria/model";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale as Locale, "", "app");
}

/**
 * Public marketing home — server-rendered and lightweight (one small client
 * island). Every figure shown is computed by the REAL engines on disclosed
 * illustrative fixtures; nothing is a fake statistic or testimonial.
 */
export default async function MarketingHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("marketing");
  const tn = await getTranslations("nav");

  // ── real engine runs (server-side, deterministic) ──
  const generic = computeGreeScore(DEMO_GENERIC, defaultPreferences);
  const better = computeGreeScore(DEMO_BETTER, defaultPreferences);
  const battle = computeBattle([DEMO_GENERIC, DEMO_MIDDLE, DEMO_BETTER], defaultPreferences);
  const cartBefore = computeCartScore(DEMO_CART_BEFORE.map((p) => ({ product: p })), defaultPreferences);
  const cartAfter = computeCartScore(DEMO_CART_AFTER.map((p) => ({ product: p })), defaultPreferences);

  const demoData: DemoData = {
    genericScore: generic.global,
    genericGrade: generic.grade,
    betterScore: better.global,
    betterGrade: better.grade,
    gain: better.global - generic.global,
    labels: {
      steps: [
        { title: t("demo.step1"), body: t("demo.step1Body") },
        { title: t("demo.step2"), body: t("demo.step2Body") },
        { title: t("demo.step3"), body: t("demo.step3Body") }
      ],
      scanning: t("demo.scanning"),
      productGeneric: t("demo.productGeneric"),
      productBetter: t("demo.productBetter"),
      reasonSugar: t("demo.reasonSugar"),
      reasonNova: t("demo.reasonNova"),
      reasonBio: t("demo.reasonBio"),
      reasonFiber: t("demo.reasonFiber"),
      trust: t("demo.step2"),
      swapGain: t("demo.swapGain", { n: better.global - generic.global }),
      before: t("swap.before"),
      after: t("swap.after")
    }
  };

  const battleNames: Record<string, string> = {
    [DEMO_GENERIC.barcode]: t("demo.productGeneric"),
    [DEMO_MIDDLE.barcode]: t("demo.productGeneric"),
    [DEMO_BETTER.barcode]: t("demo.productBetter")
  };

  return (
    <div className="mx-auto max-w-4xl space-y-16 pb-10 pt-4">
      {/* ═══ 1 · Hero ═══ */}
      <section className="flex flex-col items-center gap-5 text-center">
        <Logo size={56} />
        <p className="gc-overline">{t("hero.kicker")}</p>
        <h1 className="gc-display max-w-xl text-balance sm:text-4xl">
          <span className="gc-gradient-text">{t("hero.title")}</span>
        </h1>
        <p className="gc-body max-w-lg text-muted">{t("hero.subtitle")}</p>

        {/* Mobile-first entry: Scan is the dominant action */}
        <div className="flex w-full max-w-md flex-col items-stretch gap-2 md:hidden">
          <Link
            href="/scan"
            className="gc-pressable inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-natural-grad text-base font-semibold text-white shadow-raised"
          >
            <ScanLine className="h-5 w-5" aria-hidden /> {t("hero.ctaScan")}
          </Link>
          <Link
            href="/search"
            className="gc-pressable inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-surface-2 text-sm font-semibold"
          >
            <Search className="h-4 w-4" aria-hidden /> {t("hero.ctaSearch")}
          </Link>
        </div>

        {/* Desktop entry: search first, scan explicitly available */}
        <div className="hidden w-full max-w-xl flex-col items-center gap-2.5 md:flex">
          <SearchEntryForm placeholder={t("hero.searchPlaceholder")} label={t("hero.searchAction")} />
          <Link href="/scan" className="inline-flex items-center gap-1.5 text-sm font-semibold text-natural-strong hover:underline">
            <ScanLine className="h-4 w-4" aria-hidden /> {t("hero.ctaScan")}
          </Link>
        </div>

        <InstallPrompt />
      </section>

      {/* ═══ 2 · Interactive scan → decision demo ═══ */}
      <section aria-labelledby="mk-demo">
        <header className="mb-5 text-center">
          <h2 id="mk-demo" className="gc-title">{t("demo.title")}</h2>
          <p className="gc-caption mt-1">{t("demo.subtitle")}</p>
        </header>
        <DemoJourney data={demoData} />
        <p className="mt-4 text-center text-xs text-muted/80">{t("demo.note")}</p>
      </section>

      {/* ═══ 3 · GreeScore + Trust Halo ═══ */}
      <section aria-labelledby="mk-score" className="grid items-center gap-6 md:grid-cols-2">
        <div>
          <h2 id="mk-score" className="gc-title">{t("score.title")}</h2>
          <p className="gc-body mt-2 text-muted">{t("score.body")}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-natural-strong">
            <Sparkles className="h-4 w-4" aria-hidden /> {t("score.explain")}
          </p>
        </div>
        <GreeCard className="flex items-center justify-center gap-6 p-6">
          <StaticScoreRing value={better.global} size={110} label={better.grade} />
          <div className="flex flex-col items-start gap-2">
            <TrustHalo level="high" />
            <TrustHalo level="medium" size="sm" />
          </div>
        </GreeCard>
      </section>

      {/* ═══ 4 · GreeSwap ═══ */}
      <section aria-labelledby="mk-swap" className="grid items-center gap-6 md:grid-cols-2 md:[&>*:first-child]:order-2">
        <div>
          <h2 id="mk-swap" className="gc-title">{t("swap.title")}</h2>
          <p className="gc-body mt-2 text-muted">{t("swap.body")}</p>
        </div>
        <GreeCard className="p-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="text-center">
              <p className="gc-overline mb-1">{t("swap.before")}</p>
              <StaticScoreRing value={generic.global} size={76} />
              <p className="mt-1 text-xs font-medium">{t("demo.productGeneric")}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-natural-strong rtl:rotate-180" aria-hidden />
            <div className="rounded-2xl border border-natural/25 bg-natural/5 p-2 text-center">
              <p className="gc-overline mb-1">{t("swap.after")}</p>
              <StaticScoreRing value={better.global} size={76} />
              <p className="mt-1 text-xs font-medium">{t("demo.productBetter")}</p>
            </div>
          </div>
          <p className="mt-3 text-center">
            <GreeBadge tone="positive">{t("demo.swapGain", { n: better.global - generic.global })}</GreeBadge>
          </p>
        </GreeCard>
      </section>

      {/* ═══ 5 · Scan Battle ═══ */}
      <section aria-labelledby="mk-battle" className="grid items-center gap-6 md:grid-cols-2">
        <div>
          <h2 id="mk-battle" className="gc-title inline-flex items-center gap-2">
            <Swords className="h-5 w-5 text-natural-strong" aria-hidden /> {t("battle.title")}
          </h2>
          <p className="gc-body mt-2 text-muted">{t("battle.body")}</p>
        </div>
        <GreeCard className="p-5">
          <ol className="space-y-2">
            {battle.ranking.map((entry, i) => {
              const isWinner = i === 0;
              return (
                <li
                  key={entry.product.barcode}
                  className={`flex items-center gap-3 rounded-2xl p-2.5 ${isWinner ? "border border-natural/30 bg-natural/5" : "bg-surface-2"}`}
                >
                  <span className="w-5 text-center text-sm font-bold tabular-nums text-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{battleNames[entry.product.barcode]}</span>
                  {isWinner && (
                    <GreeBadge tone="positive" size="sm"><Trophy className="h-3 w-3" aria-hidden /> {t("battle.winner")}</GreeBadge>
                  )}
                  <StaticScoreRing value={entry.gree.global} size={44} />
                </li>
              );
            })}
          </ol>
        </GreeCard>
      </section>

      {/* ═══ 6 · GreeCart before/after simulation ═══ */}
      <section aria-labelledby="mk-cart" className="grid items-center gap-6 md:grid-cols-2 md:[&>*:first-child]:order-2">
        <div>
          <h2 id="mk-cart" className="gc-title inline-flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5 text-natural-strong" aria-hidden /> {t("cart.title")}
          </h2>
          <p className="gc-body mt-2 text-muted">{t("cart.body")}</p>
        </div>
        <GreeCard className="p-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <div>
              <p className="gc-overline mb-1">{t("cart.before")}</p>
              <StaticScoreRing value={cartBefore.global} size={84} />
            </div>
            <ArrowRight className="h-5 w-5 text-natural-strong rtl:rotate-180" aria-hidden />
            <div className="rounded-2xl border border-natural/25 bg-natural/5 p-2">
              <p className="gc-overline mb-1">{t("cart.after")}</p>
              <StaticScoreRing value={cartAfter.global} size={84} />
            </div>
          </div>
          <p className="mt-3 text-center text-xs font-medium text-muted">{t("cart.replaced", { n: 2 })}</p>
        </GreeCard>
      </section>

      {/* ═══ 7 · Privacy-first ═══ */}
      <section aria-labelledby="mk-privacy">
        <GreeCard variant="deep" glow className="gc-shine">
          <GreeCardContent className="relative flex flex-col items-center gap-4 py-8 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
              <ShieldCheck className="h-6 w-6 text-neon" aria-hidden />
            </span>
            <h2 id="mk-privacy" className="gc-title text-white">{t("privacy.title")}</h2>
            <p className="gc-body max-w-lg text-white/80">{t("privacy.body")}</p>
            <ul className="flex flex-wrap items-center justify-center gap-2">
              {[
                { icon: UserX, label: t("privacy.p1") },
                { icon: Database, label: t("privacy.p2") },
                { icon: EyeOff, label: t("privacy.p3") }
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                  <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
                </li>
              ))}
            </ul>
          </GreeCardContent>
        </GreeCard>
      </section>

      {/* ═══ 8 · Methodology & sources ═══ */}
      <section aria-labelledby="mk-method" className="text-center">
        <h2 id="mk-method" className="gc-title">{t("method.title")}</h2>
        <p className="gc-body mx-auto mt-2 max-w-lg text-muted">{t("method.body")}</p>
        <Link href="/methodology" className="gc-pressable mt-4 inline-flex h-10 items-center gap-2 rounded-2xl bg-surface-2 px-4 text-sm font-semibold">
          <BookOpenText className="h-4 w-4" aria-hidden /> {t("method.cta")}
        </Link>
      </section>

      {/* ═══ 9 · Final CTA ═══ */}
      <section aria-labelledby="mk-cta" className="text-center">
        <h2 id="mk-cta" className="gc-title">{t("final.title")}</h2>
        <p className="gc-body mt-1 text-muted">{t("final.body")}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/scan"
            className="gc-pressable inline-flex h-12 items-center gap-2 rounded-2xl bg-natural-grad px-6 text-sm font-semibold text-white shadow-raised md:hidden"
          >
            <ScanLine className="h-4 w-4" aria-hidden /> {t("final.cta")}
          </Link>
          <Link
            href="/search"
            className="gc-pressable hidden h-12 items-center gap-2 rounded-2xl bg-natural-grad px-6 text-sm font-semibold text-white shadow-raised md:inline-flex"
          >
            <Search className="h-4 w-4" aria-hidden /> {t("final.ctaDesktop")}
          </Link>
          <Link
            href="/scan"
            className="gc-pressable hidden h-12 items-center gap-2 rounded-2xl bg-surface-2 px-5 text-sm font-semibold md:inline-flex"
          >
            <ScanLine className="h-4 w-4" aria-hidden /> {tn("scan")}
          </Link>
        </div>
      </section>
    </div>
  );
}
