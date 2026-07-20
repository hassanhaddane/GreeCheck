import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HeartHandshake, ShieldCheck, EyeOff, Scale } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";
import { PageHeading } from "@/components/app/page-heading";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata(locale as Locale, "/support", "support");
}

/**
 * Support / donate — the independence charter made concrete. Static, honest:
 * no payment integration ships before launch; no fake donate button.
 */
export default async function SupportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("support");

  const points = [
    { icon: ShieldCheck, key: "pointIndependence" },
    { icon: EyeOff, key: "pointNoAds" },
    { icon: Scale, key: "pointMethodology" }
  ] as const;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      {/* manifesto — the deep hero treatment is reserved for brand statements */}
      <section className="rounded-3xl bg-deep-grad p-6 text-white shadow-float">
        <HeartHandshake className="mb-3 h-7 w-7 text-natural" aria-hidden />
        <h2 className="text-xl font-semibold tracking-tight">{t("manifestoTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/85">{t("manifestoBody")}</p>
      </section>

      <div className="mt-4 grid gap-3">
        {points.map(({ icon: Icon, key }) => (
          <GreeCard key={key}>
            <GreeCardContent className="flex items-start gap-3 py-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pastel-mint text-natural-strong">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-semibold">{t(`${key}Title`)}</h3>
                <p className="mt-0.5 text-sm text-muted">{t(`${key}Body`)}</p>
              </div>
            </GreeCardContent>
          </GreeCard>
        ))}
      </div>

      <GreeCard className="mt-4">
        <GreeCardContent className="py-4">
          <h3 className="text-sm font-semibold">{t("donateTitle")}</h3>
          <p className="mt-1 text-sm text-muted">{t("donateBody")}</p>
          <p className="mt-3 text-xs text-muted">
            {t("meanwhile")}{" "}
            <Link href="/methodology" className="font-semibold text-natural-strong hover:underline">
              {t("meanwhileLink")}
            </Link>
          </p>
        </GreeCardContent>
      </GreeCard>
    </div>
  );
}
