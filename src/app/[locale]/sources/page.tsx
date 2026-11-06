import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";
import { PageHeading } from "@/components/app/page-heading";
import { SourceDetails } from "@/components/app/source-details";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale as Locale, "/sources", "sources");
}

export default async function PublicPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sources");
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeading title={t("title")} />
      <SourceDetails />
    </div>
  );
}
