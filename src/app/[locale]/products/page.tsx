import { getTranslations, setRequestLocale } from "next-intl/server";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { HistoryClient } from "./history-client";
import { WeeklyProgress } from "./weekly-progress";

export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home.weekly");

  return (
    <div className="space-y-6">
      <HistoryClient />
      <CollapsibleSection title={t("title")}>
        <WeeklyProgress />
      </CollapsibleSection>
    </div>
  );
}
