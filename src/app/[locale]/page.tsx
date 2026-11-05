import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, ScanLine, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import { InstallPrompt } from "@/components/app/install-prompt";
import { GlobalSearch } from "@/components/app/global-search";
import { RecentProducts } from "./home-client";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale as Locale, "", "app");
}

/**
 * Localized WebApplication structured data for the home page.
 * Serialized with `<` escaped so the JSON can never break out of the script
 * element or inject markup (safe even though every value here is our own copy).
 */
function homeJsonLd(locale: string, name: string, description: string): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "GreeCheck",
    alternateName: name,
    description,
    inLanguage: locale,
    url: `${SITE_URL}/${locale}`,
    applicationCategory: "HealthApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    isAccessibleForFree: true
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Home — the scanner-first app home (GreeCheck Ultimate shell).
 * Scan and search lead into the decision loop; recent products provide a return path.
 * Server-rendered frame + small client islands over REAL local data.
 * Light-first, calm: one dominant action, pastel data, no dashboard clutter.
 */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tApp = await getTranslations("app");
  const jsonLd = homeJsonLd(locale, tApp("metaTitle"), tApp("metaDescription"));

  return (
    <div className="gc-home mx-auto max-w-[60rem]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <div className="gc-home-layout">
        <section aria-labelledby="scan-h" className="gc-scan-ticket">
          <div className="gc-ticket-copy">
            <p className="gc-ticket-label"><ScanLine aria-hidden className="h-4 w-4" /> GreeLens</p>
            <h1 id="scan-h" className="gc-editorial gc-ticket-title">{t("hero.title")}</h1>
            <p className="gc-ticket-summary">{t("hero.subtitle")}</p>
            <Link href="/scan" className="gc-pressable gc-ticket-cta">
              {t("hero.cta")} <ArrowRight className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden />
            </Link>
          </div>
          <div className="gc-ticket-art" aria-hidden="true">
            <svg viewBox="0 0 128 100" fill="none">
              <path d="M12 27V15a6 6 0 0 1 6-6h15m62 0h15a6 6 0 0 1 6 6v12m0 46v12a6 6 0 0 1-6 6H95m-62 0H18a6 6 0 0 1-6-6V73" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M28 31h3v38h-3zm7 0h5v38h-5zm10 0h2v38h-2zm6 0h4v38h-4zm9 0h2v38h-2zm7 0h5v38h-5zm9 0h2v38h-2zm6 0h3v38h-3zm7 0h2v38h-2zm6 0h5v38h-5z" fill="currentColor"/>
              <path d="M3 51h122" className="gc-ticket-scanline" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </section>
        <div className="gc-home-companion">
          <section aria-labelledby="home-search">
            <h2 id="home-search" className="gc-heading mb-2">{t("search.label")}</h2>
            <GlobalSearch home />
          </section>
          <RecentProducts />
          <Link href="/privacy" className="inline-flex min-h-10 items-center gap-2 text-sm text-muted hover:text-ink hover:underline">
            <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-natural-strong" />{t("privacyShort")}
          </Link>
        </div>
      </div>
      <InstallPrompt />
    </div>
  );
}
