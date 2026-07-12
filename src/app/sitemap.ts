import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import { SITE_URL, localizedAlternates } from "@/lib/seo";

/**
 * Sitemap — only MEANINGFUL, server-rendered pages are listed (marketing home,
 * methodology and privacy). Thin/empty or purely client result pages
 * (e.g. /search results, dynamic /product/[barcode]) are intentionally excluded
 * so we never advertise low-value or duplicated localized URLs.
 */
const PATHS = ["", "/methodology", "/privacy"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return locales.flatMap((locale) =>
    PATHS.map((path) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.6,
      alternates: {
        languages: localizedAlternates(path)
      }
    }))
  );
}
