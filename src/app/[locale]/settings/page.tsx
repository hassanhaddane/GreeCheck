"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Sun, Moon, Monitor, Target, Trash2, Shield, History, Heart, ShoppingBasket, Database, RotateCcw, Check } from "lucide-react";
import { useRouter, usePathname, Link, locales, localeMeta, type Locale } from "@/i18n/routing";
import { PageHeading } from "@/components/app/page-heading";
import { InstallPrompt } from "@/components/app/install-prompt";
import { Card, CardContent } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/app/theme-provider";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useHistoryStore } from "@/stores/history-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useBasketStore } from "@/stores/basket-store";
import { clearHistory, clearFavorites, clearBasket, clearProductCache, resetApp } from "@/lib/storage/local-data";
import { useMounted } from "@/hooks/use-mounted";
import { useConsentStore } from "@/stores/consent-store";
import { GOALS, GOAL_LABELS } from "@/lib/constants/goals";
import { cn } from "@/lib/utils/cn";

const PREF_KEYS = [
  "preferBio", "preferHalal", "preferVegan", "preferVegetarian",
  "reduceSugar", "reduceSalt", "reduceAdditives", "reduceUltraProcessed",
  "increaseProtein", "increaseFiber"
] as const;

const PREF_LABELS: Record<(typeof PREF_KEYS)[number], Record<Locale, string>> = {
  preferBio: { fr: "Préférer le bio", en: "Prefer organic", ar: "تفضيل العضوي" },
  preferHalal: { fr: "Préférer halal", en: "Prefer halal", ar: "تفضيل الحلال" },
  preferVegan: { fr: "Préférer vegan", en: "Prefer vegan", ar: "تفضيل النباتي الصرف" },
  preferVegetarian: { fr: "Préférer végétarien", en: "Prefer vegetarian", ar: "تفضيل النباتي" },
  reduceSugar: { fr: "Réduire le sucre", en: "Reduce sugar", ar: "تقليل السكر" },
  reduceSalt: { fr: "Réduire le sel", en: "Reduce salt", ar: "تقليل الملح" },
  reduceAdditives: { fr: "Réduire les additifs", en: "Reduce additives", ar: "تقليل الإضافات" },
  reduceUltraProcessed: { fr: "Éviter l'ultra-transformé", en: "Avoid ultra-processed", ar: "تجنب المعالج جداً" },
  increaseProtein: { fr: "Plus de protéines", en: "More protein", ar: "المزيد من البروتين" },
  increaseFiber: { fr: "Plus de fibres", en: "More fibres", ar: "المزيد من الألياف" }
};

/** Two-step confirm button for destructive local-data actions. */
function ConfirmButton({ label, icon, onConfirm, className }: { label: string; icon: React.ReactNode; onConfirm: () => void; className?: string }) {
  const t = useTranslations("settings");
  const tAds = useTranslations("ads");
  const [armed, setArmed] = useState(false);
  const click = () => {
    if (armed) { onConfirm(); setArmed(false); return; }
    setArmed(true);
    setTimeout(() => setArmed(false), 3000);
  };
  return (
    <button
      onClick={click}
      className={cn("gc-pressable flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition", armed ? "bg-score-e text-white" : "bg-surface-2 text-score-e", className)}
    >
      {armed ? <Check className="h-3.5 w-3.5" /> : icon}
      {armed ? t("confirm") : label}
    </button>
  );
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tAds = useTranslations("ads");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const prefs = usePreferencesStore();
  const mounted = useMounted();
  const adMode = useConsentStore((c) => c.adMode);
  const setAdMode = useConsentStore((c) => c.setMode);

  const historyCount = useHistoryStore((s) => s.entries.length);
  const favCount = useFavoritesStore((s) => s.items.length);
  const basketCount = useBasketStore((s) => s.items.length);

  const themes = [
    { id: "light", icon: Sun, label: t("themeLight") },
    { id: "dark", icon: Moon, label: t("themeDark") },
    { id: "system", icon: Monitor, label: t("themeSystem") }
  ] as const;

  const doReset = async () => {
    await resetApp();
    if (typeof window !== "undefined") window.location.reload();
  };

  const rows = [
    { icon: History, label: t("clearHistory"), count: historyCount, onClear: clearHistory },
    { icon: Heart, label: t("clearFavorites"), count: favCount, onClear: clearFavorites },
    { icon: ShoppingBasket, label: t("clearBasket"), count: basketCount, onClear: clearBasket },
    { icon: Database, label: t("clearCache"), count: null as number | null, onClear: () => clearProductCache() }
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <PageHeading title={t("title")} />
      <InstallPrompt />

      {/* Language */}
      <section>
        <SectionTitle><Globe className="me-1 inline h-4 w-4" />{t("language")}</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {locales.map((l) => (
            <Chip key={l} active={l === locale} onClick={() => router.replace(pathname, { locale: l })}>
              {localeMeta[l].flag} {localeMeta[l].label}
            </Chip>
          ))}
        </div>
      </section>

      {/* Theme */}
      <section>
        <SectionTitle>{t("theme")}</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((th) => {
            const Icon = th.icon;
            return (
              <button key={th.id} onClick={() => setTheme(th.id)} data-active={theme === th.id}
                className="gc-pressable flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface py-3 text-xs font-semibold text-muted data-[active=true]:border-transparent data-[active=true]:bg-deep data-[active=true]:text-white">
                <Icon className="h-5 w-5" /> {th.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Goals */}
      <section>
        <SectionTitle><Target className="me-1 inline h-4 w-4" />{t("goals")}</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <Chip key={g.id} active={prefs.goals.includes(g.id)} onClick={() => prefs.toggleGoal(g.id)}>
              <span>{g.emoji}</span> {GOAL_LABELS[g.id][locale]}
            </Chip>
          ))}
        </div>
      </section>

      {/* Preferences toggles */}
      <section>
        <SectionTitle>{t("preferences")}</SectionTitle>
        <Card>
          <CardContent className="divide-y divide-line p-0">
            {PREF_KEYS.map((k) => (
              <label key={k} className="flex cursor-pointer items-center justify-between px-5 py-3.5">
                <span className="text-sm font-medium">{PREF_LABELS[k][locale]}</span>
                <input
                  type="checkbox"
                  checked={Boolean(prefs[k])}
                  onChange={(e) => prefs.setPreferences({ [k]: e.target.checked })}
                  className="relative h-5 w-9 cursor-pointer appearance-none rounded-full bg-line transition before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition checked:bg-natural checked:before:translate-x-4"
                />
              </label>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Data & privacy */}
      <section>
        <SectionTitle><Shield className="me-1 inline h-4 w-4" />{t("storage")}</SectionTitle>

        {/* On-device message */}
        <Card className="border-natural/30 bg-natural/5">
          <CardContent className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-natural" />
            <p className="flex-1 text-sm leading-relaxed">{t("onDevice")}</p>
            <Link href="/privacy"><Button variant="ghost" size="sm">→</Button></Link>
          </CardContent>
        </Card>

        {/* Per-store controls */}
        <Card className="mt-3">
          <CardContent className="divide-y divide-line p-0">
            {rows.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.label} className="flex items-center gap-3 px-5 py-3">
                  <Icon className="h-5 w-5 text-muted" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.label}</p>
                    {r.count !== null && (
                      <p className="text-xs text-muted">{mounted ? (r.count > 0 ? t("items", { n: r.count }) : t("empty")) : "…"}</p>
                    )}
                  </div>
                  <ConfirmButton label={t("clearData")} icon={<Trash2 className="h-3.5 w-3.5" />} onConfirm={r.onClear} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Full reset */}
        <Card className="mt-3 border-score-e/25 bg-score-e/5">
          <CardContent className="flex items-center gap-3">
            <RotateCcw className="h-5 w-5 shrink-0 text-score-e" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{t("resetApp")}</p>
              <p className="text-xs text-muted">{t("resetHint")}</p>
            </div>
            <ConfirmButton label={t("resetApp")} icon={<RotateCcw className="h-3.5 w-3.5" />} onConfirm={doReset} className="bg-score-e/15" />
          </CardContent>
        </Card>
      </section>

      {/* Ads */}
      <section>
        <SectionTitle>{tAds("settingsTitle")}</SectionTitle>
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted">{tAds("settingsBody")}</p>
            <div className="flex flex-wrap gap-2">
              <Chip active={mounted && adMode === "non_personalized"} onClick={() => setAdMode("non_personalized")}>
                {tAds("keepNonPersonalized")}
              </Chip>
              <Chip active={mounted && adMode === "personalized"} onClick={() => setAdMode("personalized")}>
                {tAds("acceptPersonalized")}
              </Chip>
            </div>
          </CardContent>
        </Card>
      </section>

    </div>
  );
}
