import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import { SITE_URL } from "@/lib/seo";

/**
 * Sitemap — only MEANINGFUL, server-rendered pages are listed (marketing home,
 * discover, methodology, privacy). Thin/empty or purely client result pages
 * (e.g. /search results, dynamic /product/[barcode]) are intentionally excluded
 * so we never advertise low-value or duplicated localized URLs.
 */
const PATHS = ["", "/discover", "/methodology", "/privacy"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return locales.flatMap((locale) =>
    PATHS.map((path) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.6,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${path}`]))
      }
    }))
  );
}
