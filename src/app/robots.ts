import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt — allow crawling of meaningful pages, but keep API routes and the
 * client-only search results out of the index (they carry no stable, indexable
 * server content). The sitemap points crawlers at the pages worth indexing.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
