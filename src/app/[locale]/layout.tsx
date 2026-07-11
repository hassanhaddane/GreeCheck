import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, localeMeta, type Locale } from "@/i18n/routing";
import { SITE_URL } from "@/lib/seo";
import { ThemeProvider } from "@/components/app/theme-provider";
import { AppShell } from "@/components/app/app-shell";
import { PwaRegister } from "@/components/app/pwa-register";
import { LocalDataBoot } from "@/components/app/local-data-boot";
import "../globals.css";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    applicationName: "GreeCheck",
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "default", title: "GreeCheck" },
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}`]))
    },
    icons: {
      icon: [
        { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/icon.svg", type: "image/svg+xml" }
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }]
    }
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#090C0B" }
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = localeMeta[locale as Locale].dir;

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/*
          App Router has no pages/_document. Inter is loaded here with preconnect
          + display=swap. next/font is the usual alternative but requires build-time
          network access to Google Fonts, which is not available in every build
          environment; this <link> keeps the build hermetic.
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* Theme bootstrap: runs before hydration to avoid a light/dark flash. */}
        <Script id="greecheck-theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('greecheck.theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`}
        </Script>
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
            <PwaRegister />
            <LocalDataBoot />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
