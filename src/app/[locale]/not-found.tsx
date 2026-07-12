import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { GreeButton } from "@/components/system/gree-button";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="grid place-items-center py-24 text-center">
      <p className="text-6xl font-black gc-gradient-text">404</p>
      <p className="mt-2 text-muted">{t("pageNotFound")}</p>
      <Link href="/" className="mt-6"><GreeButton variant="neon">{t("backHome")}</GreeButton></Link>
    </div>
  );
}
import type { Metadata } from "next";
