import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ScanLine, ShieldCheck, ChevronRight, Search } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";
import { InstallPrompt } from "@/components/app/install-prompt";
import { FirstScanHint, WeeklyProgress, RecentProducts, ShoppingListPreview } from "./home-client";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale as Locale, "", "app");
}

/**
 * Home — the scanner-first app home (GreeCheck Ultimate shell).
 * Order is the decision loop: scan ▸ search ▸ progress ▸ recents ▸ list ▸ why.
 * Server-rendered frame + small client islands over REAL local data.
 * Light-first, calm: one dominant action, pastel data, no dashboard clutter.
 */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tn = await getTranslations("nav");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* ── 2 · immersive scan action (the ONE dominant action) ── */}
      <section aria-labelledby="scan-h">
        <Link
          href="/scan"
          className="gc-pressable group relative block overflow-hidden rounded-[2rem] bg-deep-grad p-7 pb-8 text-white shadow-float"
        >
          {/* ambient halo — calm, static at rest (neon is reserved for detection) */}
          <span aria-hidden className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full bg-neon/10 blur-2xl" />
          {/* scan bracket motif */}
          <span aria-hidden className="pointer-events-none absolute end-6 top-6 opacity-80">
            <svg width="56" height="56" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round">
              <path d="M28 76 V48 a20 20 0 0 1 20 -20 h28" />
              <path d="M180 28 h28 a20 20 0 0 1 20 20 v28" />
              <path d="M228 180 v28 a20 20 0 0 1 -20 20 h-28" />
              <path d="M76 228 h-28 a20 20 0 0 1 -20 -20 v-28" />
            </svg>
          </span>
          <h1 id="scan-h" className="max-w-[16ch] text-2xl font-semibold leading-tight tracking-tight">
            {t("hero.title")}
          </h1>
          <p className="mt-1.5 max-w-[30ch] text-sm text-white/80">{t("hero.subtitle")}</p>
          <span className="mt-5 inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-deep shadow-raised transition group-active:scale-[0.98]">
            <ScanLine className="h-5 w-5 text-natural-strong" aria-hidden /> {t("hero.cta")}
          </span>
        </Link>
        <FirstScanHint />
      </section>

      {/* ── 3 · secondary product search ── */}
      <section aria-label={t("search.label")}>
        <Link
          href="/search"
          className="gc-pressable flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 text-sm text-muted shadow-soft"
        >
          <Search className="h-[1.1rem] w-[1.1rem] shrink-0" aria-hidden />
          {t("search.placeholder")}
        </Link>
      </section>

      {/* ── 4 · weekly progress (local) ── */}
      <WeeklyProgress />

      {/* ── 5 · recent products (renders only with real history) ── */}
      <RecentProducts />

      {/* ── 6 · shopping-list preview ── */}
      <ShoppingListPreview />

      {/* ── 7 · short independence message ── */}
      <section aria-labelledby="indep-h" className="rounded-3xl bg-pastel-stone p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-natural-strong" aria-hidden />
          <div className="min-w-0">
            <h2 id="indep-h" className="text-sm font-semibold">{t("independence.title")}</h2>
            <p className="mt-0.5 text-sm text-muted">{t("independence.body")}</p>
            <Link
              href="/support"
              className="gc-pressable mt-2 inline-flex items-center gap-0.5 text-sm font-semibold text-natural-strong"
            >
              {tn("support")} <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <InstallPrompt />
    </div>
  );
}
