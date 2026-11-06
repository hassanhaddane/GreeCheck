import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";
import { PageHeading } from "@/components/app/page-heading";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale as Locale, "/contribute", "contribute");
}

export default async function PublicPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contribute");
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeading title={t("title")} />
      <GreeCard>
        <GreeCardContent className="space-y-2 text-sm leading-relaxed">
          <h2 className="font-semibold">{t("dataTitle")}</h2>
          <p>{t("dataBody")}</p>
          <a className="inline-flex min-h-11 items-center underline" href="https://world.openfoodfacts.org/contribute">{t("dataLink")}</a>
        </GreeCardContent>
      </GreeCard>
      <GreeCard>
        <GreeCardContent className="space-y-2 text-sm leading-relaxed">
          <h2 className="font-semibold">{t("appTitle")}</h2>
          <p>{t("appBody")}</p>
          <a className="inline-flex min-h-11 items-center underline" href="https://github.com/hassanhaddane/GreeCheck/issues">{t("appLink")}</a>
        </GreeCardContent>
      </GreeCard>
    </div>
  );
}
