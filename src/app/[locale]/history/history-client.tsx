"use client";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ScanLine, Heart, Trash2, ChevronRight, SlidersHorizontal, List, LayoutGrid,
  CalendarClock, MoreHorizontal, Swords, ShoppingBasket, RotateCcw, AlertTriangle, Check
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";
import { PageHeading } from "@/components/app/page-heading";
import { GreeButton } from "@/components/system/gree-button";
import { GreeCard } from "@/components/system/gree-card";
import { GreeBadge } from "@/components/system/gree-badge";
import { GreeBottomSheet } from "@/components/system/gree-bottom-sheet";
import { EmptyState } from "@/components/system/empty-state";
import { ProductRowSkeleton } from "@/components/system/loading-state";
import { GreeScoreRing } from "@/components/system/gree-score-ring";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { useHistoryStore } from "@/domains/library/history-store";
import { useFavoritesStore } from "@/domains/library/favorites-store";
import { useCartStore } from "@/domains/cart/store";
import { useBattleStore } from "@/domains/battle/store";
import { usePreferencesStore } from "@/domains/criteria/store";
import { getProduct } from "@/domains/product/repository";
import { computeGreeScore } from "@/domains/scoring/gree-score";
import {
  filterHistory, groupByDay, historyCategories, DEFAULT_FILTERS,
  type HistoryFilters, type DatePreset, type QualityPreset
} from "@/domains/library/history-view";
import type { ScanHistoryItem } from "@/domains/library/model";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils/cn";

type ViewMode = "list" | "grid" | "timeline";

function gradeTone(grade?: string): "positive" | "caution" | "negative" | "neutral" {
  if (grade === "A" || grade === "B") return "positive";
  if (grade === "C") return "caution";
  if (grade === "D" || grade === "E") return "negative";
  return "neutral";
}

export function HistoryClient() {
  const t = useTranslations("history");
  const tScore = useTranslations("score");
  const locale = useLocale() as Locale;
  const mounted = useMounted();
  const router = useRouter();

  const entries = useHistoryStore((s) => s.entries);
  const removeEntry = useHistoryStore((s) => s.remove);
  const favorites = useFavoritesStore();
  const addCart = useCartStore((s) => s.addProduct);
  const addBattle = useBattleStore((s) => s.add);
  const prefs = usePreferencesStore();

  const [view, setView] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actionsFor, setActionsFor] = useState<ScanHistoryItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 2200); };

  const categories = useMemo(() => historyCategories(entries), [entries]);
  const visible = useMemo(
    () => filterHistory(entries, filters, (b) => favorites.has(b)),
    [entries, filters, favorites]
  );
  const activeCount =
    (filters.date !== "all" ? 1 : 0) + (filters.quality !== "all" ? 1 : 0) +
    (filters.minScore > 0 || filters.maxScore < 100 ? 1 : 0) + (filters.category ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0) + (filters.organicOnly ? 1 : 0) + (filters.alertsOnly ? 1 : 0);

  const fmtDate = (ts: number) => new Date(ts).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });

  const addToCart = async (e: ScanHistoryItem) => {
    const r = await getProduct(e.barcode);
    if (r.kind === "product") { addCart(r.product, computeGreeScore(r.product, prefs)); flash(t("addedCart")); }
    else flash(t("actionUnavailable"));
    setActionsFor(null);
  };
  const toBattle = async (e: ScanHistoryItem) => {
    const r = await getProduct(e.barcode);
    if (r.kind === "product") { addBattle(r.product); flash(t("addedBattle")); }
    else flash(t("actionUnavailable"));
    setActionsFor(null);
  };

  const views: { id: ViewMode; icon: typeof List }[] = [
    { id: "list", icon: List }, { id: "grid", icon: LayoutGrid }, { id: "timeline", icon: CalendarClock }
  ];

  if (!mounted) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeading title={t("title")} />
        <div className="space-y-2"><ProductRowSkeleton /><ProductRowSkeleton /><ProductRowSkeleton /></div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeading title={t("title")} />
        <EmptyState
          icon={ScanLine}
          title={t("empty")}
          description={t("emptyBody")}
          action={<Link href="/scan"><GreeButton variant="neon" size="sm"><ScanLine className="h-4 w-4" /> {t("scanCta")}</GreeButton></Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeading title={t("title")} />

      {/* Toolbar: filters + view switch */}
      <div className="flex items-center gap-2">
        <GreeButton variant={activeCount ? "primary" : "soft"} size="sm" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" /> {t("filtersTitle")}
          {activeCount > 0 && <span className="ms-1 rounded-full bg-white/25 px-1.5 text-xs">{activeCount}</span>}
        </GreeButton>
        <div className="ms-auto flex items-center gap-1 rounded-2xl border border-line bg-surface p-1" role="group" aria-label={t("view")}>
          {views.map((v) => {
            const Icon = v.icon;
            return (
              <button key={v.id} onClick={() => setView(v.id)} data-active={view === v.id} aria-pressed={view === v.id} aria-label={t(`view_${v.id}`)}
                className="gc-pressable rounded-xl px-2.5 py-1.5 text-muted data-[active=true]:bg-deep data-[active=true]:text-white">
                <Icon className="h-4 w-4" aria-hidden />
              </button>
            );
          })}
        </div>
      </div>

      <p className="px-1 text-xs text-muted" role="status">{t("count", { n: visible.length })}</p>

      {notice && (
        <p className="rounded-2xl bg-natural/10 px-3 py-2 text-center text-sm font-medium text-natural-strong" role="status">{notice}</p>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          title={t("noMatch")}
          description={t("noMatchBody")}
          action={<GreeButton variant="soft" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}><RotateCcw className="h-4 w-4" /> {t("resetFilters")}</GreeButton>}
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {visible.map((e) => (
            <Link key={e.barcode} href={`/product/${e.barcode}`}>
              <GreeCard interactive className="flex flex-col items-center gap-2 p-3 text-center">
                <ProductThumbnail src={e.imageUrl} size="lg" className="h-16 w-16" />
                <GreeScoreRing value={e.score} size={44} label={e.grade ?? ""} />
                <p className="line-clamp-2 text-xs font-semibold">{e.name}</p>
                {e.grade && <GreeBadge tone={gradeTone(e.grade)} size="sm">{e.verdict}</GreeBadge>}
              </GreeCard>
            </Link>
          ))}
        </div>
      ) : view === "timeline" ? (
        <div className="space-y-5">
          {groupByDay(visible).map((group) => (
            <section key={group.day}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">{fmtDate(group.day)}</h2>
              <div className="space-y-2">
                {group.items.map((e) => (
                  <HistoryRow key={e.barcode} e={e} t={t} tScore={tScore} fmtDate={fmtDate}
                    isFav={favorites.has(e.barcode)} onFav={() => favorites.toggle(e)} onRemove={() => removeEntry(e.barcode)} onMore={() => setActionsFor(e)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((e) => (
            <HistoryRow key={e.barcode} e={e} t={t} tScore={tScore} fmtDate={fmtDate}
              isFav={favorites.has(e.barcode)} onFav={() => favorites.toggle(e)} onRemove={() => removeEntry(e.barcode)} onMore={() => setActionsFor(e)} />
          ))}
        </div>
      )}

      {/* Filters bottom sheet */}
      <GreeBottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title={t("filtersTitle")}>
        <div className="space-y-4">
          <FilterRow label={t("dateLabel")}>
            {(["all", "today", "week", "month"] as DatePreset[]).map((d) => (
              <ToggleChip key={d} active={filters.date === d} onClick={() => setFilters((f) => ({ ...f, date: d }))}>{t(`date_${d}`)}</ToggleChip>
            ))}
          </FilterRow>
          <FilterRow label={t("qualityLabel")}>
            {(["all", "good", "poor"] as QualityPreset[]).map((q) => (
              <ToggleChip key={q} active={filters.quality === q} onClick={() => setFilters((f) => ({ ...f, quality: q }))}>{t(`quality_${q}`)}</ToggleChip>
            ))}
          </FilterRow>
          <div className="rounded-2xl bg-surface-2 p-3">
            <label className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted">
              {t("scoreRange")} <span className="tabular-nums text-ink">{filters.minScore}–{filters.maxScore}</span>
            </label>
            <input type="range" min={0} max={100} step={5} value={filters.minScore}
              onChange={(e) => setFilters((f) => ({ ...f, minScore: Math.min(Number(e.target.value), f.maxScore) }))}
              className="mt-2 w-full accent-[rgb(var(--gc-natural-strong))]" aria-label={t("minScore")} />
            <input type="range" min={0} max={100} step={5} value={filters.maxScore}
              onChange={(e) => setFilters((f) => ({ ...f, maxScore: Math.max(Number(e.target.value), f.minScore) }))}
              className="mt-1 w-full accent-[rgb(var(--gc-natural-strong))]" aria-label={t("maxScore")} />
          </div>
          {categories.length > 0 && (
            <FilterRow label={t("categoryLabel")}>
              <ToggleChip active={!filters.category} onClick={() => setFilters((f) => ({ ...f, category: undefined }))}>{t("allCategories")}</ToggleChip>
              {categories.map((c) => (
                <ToggleChip key={c} active={filters.category === c} onClick={() => setFilters((f) => ({ ...f, category: c }))}>{c}</ToggleChip>
              ))}
            </FilterRow>
          )}
          <FilterRow label={t("moreFilters")}>
            <ToggleChip active={filters.favoritesOnly} onClick={() => setFilters((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))}>{t("favoritesOnly")}</ToggleChip>
            <ToggleChip active={filters.organicOnly} onClick={() => setFilters((f) => ({ ...f, organicOnly: !f.organicOnly }))}>{t("organicOnly")}</ToggleChip>
            <ToggleChip active={filters.alertsOnly} onClick={() => setFilters((f) => ({ ...f, alertsOnly: !f.alertsOnly }))}>{t("alertsOnly")}</ToggleChip>
          </FilterRow>
          <div className="flex gap-2">
            <GreeButton variant="soft" className="flex-1" onClick={() => setFilters(DEFAULT_FILTERS)}><RotateCcw className="h-4 w-4" /> {t("resetFilters")}</GreeButton>
            <GreeButton variant="neon" className="flex-1" onClick={() => setFiltersOpen(false)}>{t("apply", { n: visible.length })}</GreeButton>
          </div>
        </div>
      </GreeBottomSheet>

      {/* Row actions bottom sheet */}
      <GreeBottomSheet open={actionsFor !== null} onClose={() => setActionsFor(null)} title={actionsFor?.name ?? ""}>
        {actionsFor && (
          <div className="space-y-1.5">
            <ActionItem icon={ChevronRight} label={t("open")} onClick={() => { const b = actionsFor.barcode; setActionsFor(null); router.push(`/product/${b}`); }} />
            <ActionItem icon={ScanLine} label={t("scanAgain")} onClick={() => { setActionsFor(null); router.push("/scan"); }} />
            <ActionItem icon={Swords} label={t("addBattle")} onClick={() => toBattle(actionsFor)} />
            <ActionItem icon={ShoppingBasket} label={t("addCart")} onClick={() => addToCart(actionsFor)} />
            <ActionItem icon={Heart} label={favorites.has(actionsFor.barcode) ? t("unfavorite") : t("favorite")} onClick={() => { favorites.toggle(actionsFor); setActionsFor(null); }} />
            <ActionItem icon={Trash2} label={t("remove")} destructive onClick={() => { removeEntry(actionsFor.barcode); setActionsFor(null); }} />
          </div>
        )}
      </GreeBottomSheet>
    </div>
  );
}

function HistoryRow({
  e, t, tScore, fmtDate, isFav, onFav, onRemove, onMore
}: {
  e: ScanHistoryItem;
  t: (k: string, v?: Record<string, string | number>) => string;
  tScore: (k: string, v?: Record<string, string | number>) => string;
  fmtDate: (ts: number) => string;
  isFav: boolean; onFav: () => void; onRemove: () => void; onMore: () => void;
}) {
  return (
    <GreeCard interactive className="flex items-center gap-3 p-3">
      <Link href={`/product/${e.barcode}`} className="flex min-w-0 flex-1 items-center gap-3">
        <ProductThumbnail src={e.imageUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{e.name}</p>
          {e.brand && <p className="truncate text-xs text-muted">{e.brand}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {e.grade && <GreeBadge tone={gradeTone(e.grade)} size="sm">{e.verdict}</GreeBadge>}
            <span className="text-[0.65rem] text-muted">{fmtDate(e.scannedAt)}</span>
          </div>
          {e.warningCode && (
            <p className={cn("mt-1 flex items-center gap-1 text-[0.7rem]", e.critical ? "text-score-e-ink" : "text-score-d-ink")}>
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
              {tScore(`warning.${e.warningCode}`, e.warningValues)}
            </p>
          )}
        </div>
        <GreeScoreRing value={e.score} size={46} label="" />
      </Link>
      <div className="flex shrink-0 flex-col gap-1">
        <button onClick={onFav} aria-label={isFav ? t("unfavorite") : t("favorite")} aria-pressed={isFav}
          className={cn("gc-pressable grid h-8 w-8 place-items-center rounded-xl", isFav ? "bg-natural/15 text-natural-strong" : "bg-surface-2 text-muted")}>
          <Heart className={cn("h-4 w-4", isFav && "fill-current")} />
        </button>
        <button onClick={onMore} aria-label={t("moreActions")} className="gc-pressable grid h-8 w-8 place-items-center rounded-xl bg-surface-2 text-muted">
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <button onClick={onRemove} aria-label={t("remove")} className="gc-pressable grid h-8 w-8 place-items-center rounded-xl bg-surface-2 text-muted">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </GreeCard>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ToggleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} data-active={active} aria-pressed={active}
      className="gc-pressable rounded-2xl border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-muted data-[active=true]:border-transparent data-[active=true]:bg-deep data-[active=true]:text-white">
      {children}
    </button>
  );
}

function ActionItem({ icon: Icon, label, onClick, destructive }: { icon: typeof Check; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("gc-pressable flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold", destructive ? "text-score-e-ink hover:bg-score-e/5" : "hover:bg-surface-2")}>
      <Icon className="h-5 w-5 shrink-0" aria-hidden /> {label}
    </button>
  );
}
