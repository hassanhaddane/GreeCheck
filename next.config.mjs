import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.openfoodfacts.org" },
      { protocol: "https", hostname: "world.openfoodfacts.org" },
      { protocol: "https", hostname: "static.openfoodfacts.org" }
    ]
  },
  async redirects() {
    // V1 → V2 route moves (kept permanently for old bookmarks / PWA shortcuts).
    return [
      { source: "/:locale(fr|en|ar)/basket", destination: "/:locale/cart", permanent: true },
      { source: "/:locale(fr|en|ar)/list", destination: "/:locale/cart", permanent: true },
      { source: "/:locale(fr|en|ar)/map", destination: "/:locale", permanent: true }
    ];
  }
};

export default withNextIntl(nextConfig);
