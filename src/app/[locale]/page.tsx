"use client";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ScanLine, Search, Swords, ShoppingBasket, ShieldCheck, ArrowRight, ChevronRight, History } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductRowSkeleton } from "@/components/ui/skeleton";
import { ScoreRing } from "@/components/score/score-ring";
import { AdSlot } from "@/components/layout/ad-slot";
import { useHistoryStore } from "@/stores/history-store";
import { useMounted } from "@/lib/utils/use-mounted";

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
  const mounted = useMounted();
  const entries = useHistoryStore((s) => s.entries);

  const actions = [
    { key: "search", href: "/search", icon: Search, hint: "Filtres intelligents" },
    { key: "battle", href: "/battle", icon: Swords, hint: "Compare jusqu'à 3" },
    { key: "basket", href: "/basket", icon: ShoppingBasket, hint: "Note ton panier" }
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      {/* Brand + slogan */}
      <motion.div {...fade(0)} className="flex flex-col items-center gap-3 pt-3 text-center">
        <Logo size={56} />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Gree<span className="text-natural">Check</span>
          </h1>
          <p className="mt-1 text-sm font-medium text-muted">{tApp("tagline")}</p>
        </div>
      </motion.div>

      {/* Primary scan hero */}
      <motion.div {...fade(1)}>
        <Link href="/scan" className="block">
          <Card className="gc-pressable relative overflow-hidden bg-deep-grad p-6 text-white shadow-glass">
            <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-neon/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-natural/20 blur-3xl" />
            <div className="relative flex items-center gap-5">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-neon-grad shadow-glow">
                <ScanLine className="h-8 w-8 text-deep" strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold leading-tight">{t("scanCta")}</p>
                <p className="mt-0.5 text-sm text-white/65">{t("heroSubtitle")}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-neon rtl:rotate-180" />
            </div>
          </Card>
        </Link>
      </motion.div>

      {/* Scan Battle — star feature */}
      <motion.div {...fade(2)}>
        <Link href="/battle" className="block">
          <Card className="gc-pressable relative flex items-center gap-4 overflow-hidden border-natural/30 bg-natural/5 p-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neon-grad text-deep shadow-glow">
              <Swords className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-bold">
                {tb("title")}
                <span className="rounded-full bg-neon-grad px-1.5 py-0.5 text-[0.55rem] font-bold uppercase text-deep">★</span>
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{tb("subtitle")}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted rtl:rotate-180" />
          </Card>
        </Link>
      </motion.div>

      {/* Named actions */}
      <section>
        <SectionTitle>{t("quickActions")}</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {actions.map((a, i) => {
            const Icon = a.icon;
            return (
              <motion.div key={a.key} {...fade(2 + i)}>
                <Link href={a.href}>
                  <Card className="gc-pressable flex h-full flex-col gap-3 p-4 hover:shadow-glass">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-surface-2 text-natural">
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{tn(a.key)}</p>
                      <p className="mt-0.5 text-[0.7rem] leading-tight text-muted">{a.hint}</p>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Recent history */}
      <motion.section {...fade(5)}>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{t("recent")}</h2>
          {mounted && entries.length > 0 && (
            <Link href="/settings" className="flex items-center gap-0.5 text-xs font-medium text-natural">
              <History className="h-3.5 w-3.5" /> Tout
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
            action={<Link href="/scan"><Button variant="soft" size="sm">{t("scanCta")}</Button></Link>}
          />
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 5).map((e) => (
              <Link key={e.barcode} href={`/product/${e.barcode}`}>
                <Card className="gc-pressable flex items-center gap-3 p-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-2" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.name}</p>
                    <p className="truncate text-xs text-muted">{e.verdict}</p>
                  </div>
                  <ScoreRing value={e.score} size={46} label="" />
                  <ChevronRight className="h-4 w-4 text-muted rtl:rotate-180" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </motion.section>

      {/* Privacy-first message */}
      <motion.div {...fade(6)}>
        <Link href="/privacy">
          <Card className="gc-pressable flex items-center gap-3 border-natural/25 bg-natural/5 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-natural/10 text-natural">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <p className="flex-1 text-sm font-medium leading-snug">{tApp("privacyBadge")}</p>
            <ChevronRight className="h-4 w-4 text-muted rtl:rotate-180" />
          </Card>
        </Link>
      </motion.div>

      <AdSlot />
    </div>
  );
}
