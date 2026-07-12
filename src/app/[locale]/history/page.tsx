import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";
import { HistoryClient } from "./history-client";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const metadata = await buildPageMetadata(locale as Locale, "/history", "history");
  return { ...metadata, robots: { index: false, follow: false } };
}

export default async function HistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HistoryClient />;
}
