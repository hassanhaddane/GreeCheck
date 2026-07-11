"use client";
import { useLocale, useTranslations } from "next-intl";
import { Target, ShieldCheck } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { PageHeading } from "@/components/app/page-heading";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { SectionTitle } from "@/components/ui/section-title";
import { Chip } from "@/components/ui/chip";
import { usePreferencesStore } from "@/domains/criteria/store";
import { GOALS, GOAL_LABELS, PREF_KEYS, PREF_LABELS } from "@/domains/criteria/goals";
import { useMounted } from "@/hooks/use-mounted";

/** "Mes critères" — optional, never blocking; criteria never change the base health score. */
export function CriteriaClient() {
  const t = useTranslations("criteria");
  const locale = useLocale() as Locale;
  const prefs = usePreferencesStore();
  const mounted = useMounted();

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <PageHeading title={t("title")} />

      <GreeCard className="border-natural/25 bg-natural/5">
        <GreeCardContent className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-natural-strong" aria-hidden />
          <p className="text-sm leading-relaxed">{t("hint")}</p>
        </GreeCardContent>
      </GreeCard>

      {/* Goals */}
      <section>
        <SectionTitle><Target className="me-1 inline h-4 w-4" />{t("goals")}</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <Chip key={g.id} active={mounted && prefs.goals.includes(g.id)} onClick={() => prefs.toggleGoal(g.id)}>
              <span aria-hidden>{g.emoji}</span> {GOAL_LABELS[g.id][locale]}
            </Chip>
          ))}
        </div>
      </section>

      {/* Preference toggles */}
      <section>
        <SectionTitle>{t("preferences")}</SectionTitle>
        <GreeCard>
          <GreeCardContent className="divide-y divide-line p-0">
            {PREF_KEYS.map((k) => (
              <label key={k} className="flex cursor-pointer items-center justify-between px-5 py-3.5">
                <span className="text-sm font-medium">{PREF_LABELS[k][locale]}</span>
                <input
                  type="checkbox"
                  checked={mounted && Boolean(prefs[k])}
                  onChange={(e) => prefs.setPreferences({ [k]: e.target.checked })}
                  className="relative h-5 w-9 cursor-pointer appearance-none rounded-full bg-line transition before:absolute before:start-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition checked:bg-natural checked:before:translate-x-4 rtl:checked:before:-translate-x-4"
                />
              </label>
            ))}
          </GreeCardContent>
        </GreeCard>
      </section>
    </div>
  );
}
