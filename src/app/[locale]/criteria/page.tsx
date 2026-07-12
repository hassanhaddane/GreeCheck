import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";
import { CriteriaClient } from "./criteria-client";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const metadata = await buildPageMetadata(locale as Locale, "/criteria", "criteria");
  return { ...metadata, robots: { index: false, follow: false } };
}

export default async function CriteriaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CriteriaClient />;
}
