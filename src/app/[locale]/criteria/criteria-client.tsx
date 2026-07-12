"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldCheck, MapPin, SlidersHorizontal, Gauge, Plus, X } from "lucide-react";
import { PageHeading } from "@/components/app/page-heading";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { usePreferencesStore } from "@/domains/criteria/store";
import type { PrefKey } from "@/domains/criteria/goals";
import { useMounted } from "@/hooks/use-mounted";

/** The 8 default-visible criteria (order per spec). */
const DEFAULT_KEYS: PrefKey[] = [
  "preferBio", "preferHalal", "reduceSugar", "reduceSalt",
  "reduceAdditives", "reduceUltraProcessed", "increaseProtein", "increaseFiber"
];
const ADVANCED_KEYS: PrefKey[] = ["preferVegan", "preferVegetarian"];

/** Allergen / restriction presets — canonical needles match OFF allergen tags. */
const ALLERGEN_PRESETS = ["gluten", "milk", "lactose", "eggs", "peanuts", "nuts", "soybeans", "palm"] as const;

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between px-5 py-3.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="relative h-5 w-9 cursor-pointer appearance-none rounded-full bg-line transition before:absolute before:start-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition checked:bg-natural checked:before:translate-x-4 rtl:checked:before:-translate-x-4"
      />
    </label>
  );
}

/** "Mes critères" — optional, never blocking; criteria never change the base health score. */
export function CriteriaClient() {
  const t = useTranslations("criteria");
  const prefs = usePreferencesStore();
  const mounted = useMounted();
  const [draft, setDraft] = useState("");

  const allergens = prefs.avoidAllergens ?? [];
  const addAllergen = (raw: string) => {
    const a = raw.trim().toLowerCase();
    if (!a || allergens.includes(a)) return;
    prefs.setPreferences({ avoidAllergens: [...allergens, a] });
  };
  const removeAllergen = (a: string) => prefs.setPreferences({ avoidAllergens: allergens.filter((x) => x !== a) });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeading title={t("title")} />

      {/* Clear, honest explanation — never forces completion. */}
      <GreeCard className="border-natural/25 bg-natural/5">
        <GreeCardContent className="space-y-2.5">
          <p className="flex items-start gap-2 text-sm leading-relaxed">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-natural-strong" aria-hidden /> {t("explainLocal")}
          </p>
          <p className="flex items-start gap-2 text-sm leading-relaxed">
            <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-natural-strong" aria-hidden /> {t("explainCompat")}
          </p>
          <p className="flex items-start gap-2 text-sm leading-relaxed">
            <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-natural-strong" aria-hidden /> {t("explainNotScore")}
          </p>
          <p className="pt-1 text-xs text-muted">{t("optional")}</p>
        </GreeCardContent>
      </GreeCard>

      {/* Default criteria */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">{t("preferences")}</h2>
        <GreeCard>
          <GreeCardContent className="divide-y divide-line p-0">
            {DEFAULT_KEYS.map((k) => (
              <Toggle key={k} label={t(`preferenceLabels.${k}`)} checked={mounted && Boolean(prefs[k])} onChange={(v) => prefs.setPreferences({ [k]: v })} />
            ))}
          </GreeCardContent>
        </GreeCard>
      </section>

      {/* Advanced */}
      <CollapsibleSection title={t("advanced")} icon={<MapPin className="h-5 w-5" />}>
        <p className="mb-3 text-sm text-muted">{t("advancedHint")}</p>

        <GreeCard>
          <GreeCardContent className="divide-y divide-line p-0">
            {ADVANCED_KEYS.map((k) => (
              <Toggle key={k} label={t(`preferenceLabels.${k}`)} checked={mounted && Boolean(prefs[k])} onChange={(v) => prefs.setPreferences({ [k]: v })} />
            ))}
          </GreeCardContent>
        </GreeCard>

        {/* Allergens & restrictions */}
        <div className="mt-4">
          <p className="mb-1 text-sm font-semibold">{t("allergens")}</p>
          <p className="mb-2.5 text-xs text-muted">{t("allergensHint")}</p>

          <div className="flex flex-wrap gap-2">
            {ALLERGEN_PRESETS.map((token) => {
              const on = mounted && allergens.includes(token);
              return (
                <button key={token} type="button" onClick={() => (on ? removeAllergen(token) : addAllergen(token))} data-active={on} aria-pressed={on}
                  className="gc-pressable rounded-2xl border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-muted data-[active=true]:border-transparent data-[active=true]:bg-score-e data-[active=true]:text-white">
                  {t(`allergenPresets.${token}`)}
                </button>
              );
            })}
          </div>

          {/* Custom allergen input */}
          <div className="mt-3 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { addAllergen(draft); setDraft(""); } }}
              placeholder={t("allergenPlaceholder")}
              className="h-10 flex-1 rounded-2xl border border-line bg-surface-2 px-3 text-sm outline-none focus:ring-2 focus:ring-neon/50"
              aria-label={t("addAllergen")}
            />
            <button type="button" onClick={() => { addAllergen(draft); setDraft(""); }} aria-label={t("addAllergen")}
              className="gc-pressable grid h-10 w-10 place-items-center rounded-2xl bg-deep text-white">
              <Plus className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {/* Selected custom allergens */}
          {mounted && allergens.filter((a) => !ALLERGEN_PRESETS.includes(a as (typeof ALLERGEN_PRESETS)[number])).length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {allergens.filter((a) => !ALLERGEN_PRESETS.includes(a as (typeof ALLERGEN_PRESETS)[number])).map((a) => (
                <span key={a} className="inline-flex items-center gap-1 rounded-full bg-score-e/10 px-2.5 py-1 text-xs font-medium capitalize text-score-e-ink">
                  {a}
                  <button type="button" onClick={() => removeAllergen(a)} aria-label={`${t("remove")} ${a}`}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}
