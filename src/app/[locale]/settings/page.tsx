"use client";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Sun, Moon, Monitor, Target, Trash2, Shield } from "lucide-react";
import { useRouter, usePathname, Link, locales, localeMeta, type Locale } from "@/i18n/routing";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/layout/theme-provider";
import { usePreferencesStore } from "@/stores/preferences-store";
import { useHistoryStore } from "@/stores/history-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useBasketStore } from "@/stores/basket-store";
import { GOALS, GOAL_LABELS } from "@/lib/constants/goals";

const PREF_KEYS = [
  "preferBio", "preferHalal", "preferVegan", "preferVegetarian",
  "reduceSugar", "reduceSalt", "reduceAdditives", "reduceUltraProcessed",
  "increaseProtein", "increaseFiber"
] as const;

export default function SettingsPage() {
  const t = useTranslations("settings");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const prefs = usePreferencesStore();

  const clearAll = () => {
    useHistoryStore.getState().clear();
    useFavoritesStore.getState().clear();
    useBasketStore.getState().clear();
    prefs.reset();
  };

  const themes = [
    { id: "light", icon: Sun, label: t("themeLight") },
    { id: "dark", icon: Moon, label: t("themeDark") },
    { id: "system", icon: Monitor, label: t("themeSystem") }
  ] as const;

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <PageHeading title={t("title")} />

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
              <button
                key={th.id}
                onClick={() => setTheme(th.id)}
                data-active={theme === th.id}
                className="gc-pressable flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface py-3 text-xs font-semibold text-muted data-[active=true]:border-transparent data-[active=true]:bg-deep data-[active=true]:text-white"
              >
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
                <span className="text-sm font-medium">{k}</span>
                <input
                  type="checkbox"
                  checked={Boolean(prefs[k])}
                  onChange={(e) => prefs.setPreferences({ [k]: e.target.checked })}
                  className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-line transition checked:bg-natural relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition checked:before:translate-x-4"
                />
              </label>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Data */}
      <section>
        <SectionTitle>{t("data")}</SectionTitle>
        <Card className="border-natural/30 bg-natural/5">
          <CardContent className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-natural" />
            <p className="flex-1 text-sm">{t("preferences")} 100% local</p>
            <Link href="/privacy"><Button variant="ghost" size="sm">→</Button></Link>
          </CardContent>
        </Card>
        <Button variant="soft" className="mt-3 w-full text-score-e" onClick={clearAll}>
          <Trash2 className="h-4 w-4" /> {t("clearData")}
        </Button>
      </section>
    </div>
  );
}
