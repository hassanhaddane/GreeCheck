import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locales, routing, type Locale } from "@/i18n/routing";

/** Public origin used for canonical / hreflang URLs. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://greecheck.app";

const OPEN_GRAPH_LOCALE: Record<Locale, string> = { fr: "fr_FR", en: "en_GB", ar: "ar_SA" };

export function localizedAlternates(path: string) {
  const languages: Record<string, string> = Object.fromEntries(locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`]));
  languages["x-default"] = `${SITE_URL}/${routing.defaultLocale}${path}`;
  return languages;
}

/**
 * Server-rendered, localized page metadata with canonical + hreflang.
 * `namespace` must provide `metaTitle` and `metaDescription`.
 */
export async function buildPageMetadata(
  locale: Locale,
  path: string,
  namespace: string
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace });
  const suffix = path === "" ? "" : path;
  const canonical = `${SITE_URL}/${locale}${suffix}`;
  const title = t("metaTitle");
  const description = t("metaDescription");
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: localizedAlternates(suffix)
    },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "GreeCheck",
      title,
      description,
      locale: OPEN_GRAPH_LOCALE[locale],
      alternateLocale: locales.filter((value) => value !== locale).map((value) => OPEN_GRAPH_LOCALE[value]),
      images: [{ url: `${SITE_URL}/icons/icon-512.png`, width: 512, height: 512, alt: "GreeCheck" }]
    },
    twitter: { card: "summary", title, description, images: [`${SITE_URL}/icons/icon-512.png`] }
  };
}
