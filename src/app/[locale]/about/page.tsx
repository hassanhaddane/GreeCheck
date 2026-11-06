import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, type Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";
import { PageHeading } from "@/components/app/page-heading";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale as Locale, "/about", "about");
}

export default async function PublicPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeading title={t("title")} />
      <GreeCard>
        <GreeCardContent className="space-y-3 text-sm leading-relaxed">
          <p>{t("intro")}</p>
          <p>{t("independence")}</p>
          <nav aria-label={t("title")} className="flex flex-wrap gap-x-4">
            <Link className="inline-flex min-h-11 items-center underline" href="/methodology">{t("method")}</Link>
            <Link className="inline-flex min-h-11 items-center underline" href="/sources">{t("sources")}</Link>
            <Link className="inline-flex min-h-11 items-center underline" href="/privacy">{t("privacy")}</Link>
            <Link className="inline-flex min-h-11 items-center underline" href="/contribute">{t("contribute")}</Link>
            <Link className="inline-flex min-h-11 items-center underline" href="/support">{t("support")}</Link>
          </nav>
        </GreeCardContent>
      </GreeCard>
    </div>
  );
}
