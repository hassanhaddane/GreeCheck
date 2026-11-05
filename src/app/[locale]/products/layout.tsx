import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeading } from "@/components/app/page-heading";
import { LibraryNavigation } from "./library-navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("products"), alternates: null, robots: { index: false, follow: false } };
}

export default async function ProductsLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeading title={t("products")} />
      <LibraryNavigation />
      {children}
    </div>
  );
}
