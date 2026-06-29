import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, localeMeta, type Locale } from "@/i18n/routing";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { PwaRegister } from "@/components/layout/pwa-register";
import "../globals.css";

export const metadata: Metadata = {
  title: "GreeCheck — Scanne. Comprends. Choisis mieux.",
  description:
    "Plateforme nutritionnelle premium. Scanne un produit pour découvrir son GreeScore personnalisé. Privacy-first, sans compte.",
  applicationName: "GreeCheck",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "GreeCheck" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon.svg" }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#090C0B" }
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('greecheck.theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`
          }}
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
            <PwaRegister />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
