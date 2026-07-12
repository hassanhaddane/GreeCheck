import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";
import { DiscoverClient } from "./discover-client";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const metadata = await buildPageMetadata(locale as Locale, "/discover", "discover");
  return { ...metadata, robots: { index: false, follow: true } };
}

export default async function DiscoverPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DiscoverClient />;
}
