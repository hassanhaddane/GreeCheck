"use client";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  ScanLine, Search, Swords, ShoppingBasket, ArrowRight, ChevronRight,
  History, Target, Sparkles
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { Logo } from "@/components/app/logo";
import { InstallPrompt } from "@/components/app/install-prompt";
import { GreeButton } from "@/components/system/gree-button";
import { GreeCard } from "@/components/system/gree-card";
import { PrivacyPill } from "@/components/ui/privacy-pill";
import { SectionTitle } from "@/components/ui/section-title";
import { EmptyState } from "@/components/system/empty-state";
import { ProductRowSkeleton } from "@/components/system/loading-state";
import { GreeScoreRing } from "@/components/system/gree-score-ring";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { GOALS, GOAL_LABELS } from "@/domains/criteria/goals";
import { useHistoryStore } from "@/domains/library/history-store";
import { usePreferencesStore } from "@/domains/criteria/store";
import { useMounted } from "@/hooks/use-mounted";

const fade = (i = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const }
});

export default function HomePage() {
  const t = useTranslations("home");
  const tn = useTranslations("nav");
  const tApp = useTranslations("app");
  const tb = useTranslations("battle");
  const tCriteria = useTranslations("criteria");
  const locale = useLocale() as "fr" | "en" | "ar";
  const mounted = useMounted();
  const entries = useHistoryStore((s) => s.entries);
  const goals = usePreferencesStore((s) => s.goals);

  const actions = [
    { key: "search", href: "/search", icon: Search, hint: t("hintSearch") },
    { key: "battle", href: "/battle", icon: Swords, hint: t("hintBattle") },
    { key: "cart", href: "/cart", icon: ShoppingBasket, hint: t("hintCart") },
    { key: "history", href: "/history", icon: History, hint: t("hintHistory") }
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      {/* ── Compact hero: brand + slogan + privacy ── */}
      <motion.div {...fade(0)} className="flex flex-col items-center gap-2.5 pt-2 text-center">
        <Logo size={52} />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Gree<span className="gc-gradient-text">Check</span>
          </h1>
          <p className="mt-1 text-sm font-medium text-muted">{tApp("tagline")}</p>
        </div>
        <PrivacyPill className="sm:hidden" />
      </motion.div>

      <InstallPrompt />

      {/* ── GreeLens scan hero — the dominant action ── */}
      <motion.div {...fade(1)}>
        <Link href="/scan" className="block">
          <GreeCard variant="deep" interactive glow className="gc-shine p-6">
            <div className="relative flex items-center gap-5">
              <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-natural-grad shadow-raised">
                <span aria-hidden className="absolute inset-0 animate-radar-sweep rounded-2xl bg-[conic-gradient(from_0deg,transparent_75%,rgba(255,255,255,0.35))]" />
                <ScanLine className="h-8 w-8 text-deep" strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-lg font-bold leading-tight">
                  {t("scanCta")}
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-neon">
                    {t("greeLens")}
                  </span>
                </p>
                <p className="mt-0.5 text-sm text-white/65">{t("greeLensHint")}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-neon rtl:rotate-180" />
            </div>
          </GreeCard>
        </Link>
      </motion.div>

      {/* ── Scan Battle — star feature ── */}
      <motion.div {...fade(2)}>
        <Link href="/battle" className="block">
          <GreeCard variant="tinted" interactive className="flex items-center gap-4 p-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-natural-grad text-white shadow-raised">
              <Swords className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-bold">
                {tb("title")}
                <Sparkles className="h-3.5 w-3.5 text-natural-strong" aria-hidden />
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{tb("subtitle")}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted rtl:rotate-180" />
          </GreeCard>
        </Link>
      </motion.div>

      {/* ── Quick actions ── */}
      <section>
        <SectionTitle>{t("quickActions")}</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((a, i) => {
            const Icon = a.icon;
            return (
              <motion.div key={a.key} {...fade(2 + i)}>
                <Link href={a.href} className="block h-full">
                  <GreeCard interactive className="flex h-full flex-col gap-3 p-4">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-natural/10 text-natural-strong">
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{tn(a.key)}</p>
                      <p className="mt-0.5 text-[0.7rem] leading-tight text-muted">{a.hint}</p>
                    </div>
                  </GreeCard>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Current mode (local goals) ── */}
      <motion.section {...fade(5)}>
        <SectionTitle>{t("modeTitle")}</SectionTitle>
        <GreeCard variant="glass" className="p-4">
          {!mounted ? (
            <ProductRowSkeleton />
          ) : goals.length === 0 ? (
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                <Target className="h-5 w-5" />
              </span>
              <p className="flex-1 text-sm text-muted">{t("noGoals")}</p>
              <Link href="/criteria">
                <GreeButton variant="soft" size="sm">{t("setGoals")}</GreeButton>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {goals.map((g) => {
                  const def = GOALS.find((x) => x.id === g);
                  return (
                    <span key={g} className="gc-chip px-2.5 py-1 text-xs" data-active="true">
                      <span aria-hidden>{def?.emoji}</span> {GOAL_LABELS[g][locale]}
                    </span>
                  );
                })}
              </div>
              <Link href="/criteria" className="flex items-center gap-1 text-xs font-medium text-natural-strong">
                <Target className="h-3.5 w-3.5" /> {tCriteria("title")} <ChevronRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            </div>
          )}
        </GreeCard>
      </motion.section>

      {/* ── Recent choices ── */}
      <motion.section {...fade(6)}>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("recent")}</h2>
          {mounted && entries.length > 0 && (
            <Link href="/history" className="flex items-center gap-0.5 text-xs font-medium text-natural-strong">
              <History className="h-3.5 w-3.5" /> {t("seeAll")}
            </Link>
          )}
        </div>

        {!mounted ? (
          <div className="space-y-2">
            <ProductRowSkeleton />
            <ProductRowSkeleton />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={ScanLine}
            title={t("emptyRecent")}
            action={<Link href="/scan"><GreeButton variant="neon" size="sm">{t("scanCta")}</GreeButton></Link>}
          />
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 5).map((e) => (
              <Link key={e.barcode} href={`/product/${e.barcode}`} className="block">
                <GreeCard interactive className="flex items-center gap-3 p-3">
                  <ProductThumbnail src={e.imageUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.name}</p>
                    <p className="truncate text-xs text-muted">{e.verdict}</p>
                  </div>
                  <GreeScoreRing value={e.score} size={46} label="" />
                  <ChevronRight className="h-4 w-4 text-muted rtl:rotate-180" />
                </GreeCard>
              </Link>
            ))}
          </div>
        )}
      </motion.section>

    </div>
  );
}
