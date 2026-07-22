import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy.
 *
 * The app is statically generated (55 prerendered pages), so a nonce-based CSP
 * is not viable — nonces force every route to render dynamically. We therefore
 * ship a static policy: strict on network/frame/object directives, with
 * 'unsafe-inline' limited to the inline bootstrap Next.js emits.
 * Rationale and tightening path: docs/production/security.md.
 */
const csp = [
  "default-src 'self'",
  // 'unsafe-eval' is only needed by the WASM OCR beta in non-production builds.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  // OFF product photography + local blob/data previews (canvas, OCR beta).
  "img-src 'self' data: blob: https://images.openfoodfacts.org https://world.openfoodfacts.org https://static.openfoodfacts.org",
  "font-src 'self' data:",
  // Same-origin API proxies only. No third-party beacons: there is no analytics.
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // Camera is used by GreeLens on this origin only; everything else is denied.
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.openfoodfacts.org" },
      { protocol: "https", hostname: "world.openfoodfacts.org" },
      { protocol: "https", hostname: "static.openfoodfacts.org" }
    ]
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // API proxies serve public product data only — never indexed.
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] }
    ];
  },
  async redirects() {
    // V1 → V2 route moves (kept permanently for old bookmarks / PWA shortcuts).
    // NOTE: `/list` is deliberately NOT redirected — it is now the Shopping List.
    return [
      { source: "/:locale(fr|en|ar)/basket", destination: "/:locale/cart", permanent: true },
      { source: "/:locale(fr|en|ar)/map", destination: "/:locale", permanent: true }
    ];
  }
};

export default withNextIntl(nextConfig);
