import type { Metadata } from "next";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";
import { SearchClient } from "./search-client";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const metadata = await buildPageMetadata(locale as Locale, "/search", "search");
  return { ...metadata, robots: { index: false, follow: true } };
}

export default async function SearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={<div className="mx-auto h-40 max-w-2xl animate-pulse rounded-3xl bg-surface-2" />}>
      <SearchClient />
    </Suspense>
  );
}
