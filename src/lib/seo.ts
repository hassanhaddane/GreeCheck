import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locales, type Locale } from "@/i18n/routing";

/** Public origin used for canonical / hreflang URLs. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://greecheck.app";

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
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `${SITE_URL}/${locale}${suffix}`,
      languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${suffix}`]))
    }
  };
}
