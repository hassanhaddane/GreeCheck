"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Sun, Moon, Monitor, Target, Trash2, Shield, History, Heart, ShoppingBasket, Database, RotateCcw, Check, ChevronRight } from "lucide-react";
import { useRouter, usePathname, Link, locales, localeMeta, type Locale } from "@/i18n/routing";
import { PageHeading } from "@/components/app/page-heading";
import { InstallPrompt } from "@/components/app/install-prompt";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { SectionTitle } from "@/components/ui/section-title";
import { Chip } from "@/components/ui/chip";
import { GreeButton } from "@/components/system/gree-button";
import { useTheme } from "@/components/app/theme-provider";
import { useHistoryStore } from "@/domains/library/history-store";
import { useFavoritesStore } from "@/domains/library/favorites-store";
import { useCartStore } from "@/domains/cart/store";
import { clearHistory, clearFavorites, clearCart, clearProductCache, clearPreferences, resetApp } from "@/services/storage/local-data";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils/cn";



/** Two-step confirm button for destructive local-data actions. */
function ConfirmButton({ label, icon, onConfirm, className }: { label: string; icon: React.ReactNode; onConfirm: () => void; className?: string }) {
  const t = useTranslations("settings");
  const [armed, setArmed] = useState(false);
  const click = () => {
    if (armed) { onConfirm(); setArmed(false); return; }
    setArmed(true);
    setTimeout(() => setArmed(false), 3000);
  };
  return (
    <button
      onClick={click}
      className={cn("gc-pressable flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition", armed ? "bg-score-e text-white" : "bg-surface-2 text-score-e-ink", className)}
    >
      {armed ? <Check className="h-3.5 w-3.5" /> : icon}
      {armed ? t("confirm") : label}
    </button>
  );
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const historyCount = useHistoryStore((s) => s.entries.length);
  const favCount = useFavoritesStore((s) => s.items.length);
  const basketCount = useCartStore((s) => s.items.length);

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
    { icon: ShoppingBasket, label: t("clearCart"), count: basketCount, onClear: clearCart },
    { icon: Target, label: t("resetPrefs"), count: null as number | null, onClear: () => clearPreferences() },
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



      {/* Mes critères */}
      <section>
        <SectionTitle><Target className="me-1 inline h-4 w-4" />{t("criteriaTitle")}</SectionTitle>
        <Link href="/criteria" className="block">
          <GreeCard className="gc-pressable flex items-center gap-3 p-4">
            <p className="flex-1 text-sm text-muted">{t("criteriaHint")}</p>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted rtl:rotate-180" aria-hidden />
          </GreeCard>
        </Link>
      </section>

      {/* Data & privacy */}
      <section>
        <SectionTitle><Shield className="me-1 inline h-4 w-4" />{t("storage")}</SectionTitle>

        {/* On-device message */}
        <GreeCard className="border-natural/30 bg-natural/5">
          <GreeCardContent className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-natural-strong" />
            <p className="flex-1 text-sm leading-relaxed">{t("onDevice")}</p>
            <Link href="/privacy"><GreeButton variant="ghost" size="sm">→</GreeButton></Link>
          </GreeCardContent>
        </GreeCard>

        {/* Per-store controls */}
        <GreeCard className="mt-3">
          <GreeCardContent className="divide-y divide-line p-0">
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
          </GreeCardContent>
        </GreeCard>

        {/* Full reset */}
        <GreeCard className="mt-3 border-score-e/25 bg-score-e/5">
          <GreeCardContent className="flex items-center gap-3">
            <RotateCcw className="h-5 w-5 shrink-0 text-score-e-ink" />
            <div className="flex-1">
              <p className="text-sm font-semibold">{t("resetApp")}</p>
              <p className="text-xs text-muted">{t("resetHint")}</p>
            </div>
            <ConfirmButton label={t("resetApp")} icon={<RotateCcw className="h-3.5 w-3.5" />} onConfirm={doReset} className="bg-score-e/15" />
          </GreeCardContent>
        </GreeCard>
      </section>
    </div>
  );
}
