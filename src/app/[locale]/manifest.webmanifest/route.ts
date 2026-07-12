import { getTranslations } from "next-intl/server";
import { localeMeta, routing, type Locale } from "@/i18n/routing";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = routing.locales.includes(rawLocale as Locale) ? rawLocale as Locale : routing.defaultLocale;
  const app = await getTranslations({ locale, namespace: "app" });
  const nav = await getTranslations({ locale, namespace: "nav" });

  const manifest = {
    id: "/",
    name: app("metaTitle"),
    short_name: "GreeCheck",
    description: app("metaDescription"),
    lang: locale,
    dir: localeMeta[locale].dir,
    start_url: `/${locale}/scan?source=pwa`,
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#FAFAF7",
    theme_color: "#0B3D2E",
    categories: ["food", "health", "lifestyle", "shopping"],
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ],
    shortcuts: [
      { name: nav("scan"), short_name: nav("scan"), url: `/${locale}/scan?source=pwa`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: nav("search"), short_name: nav("search"), url: `/${locale}/search`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: nav("battle"), short_name: nav("battle"), url: `/${locale}/battle`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }
    ]
  };

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"
    }
  });
}
