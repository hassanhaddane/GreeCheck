"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Minus, Trash2, ScanLine } from "lucide-react";
import { Link } from "@/i18n/routing";
import { PageHeading } from "@/components/app/page-heading";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { GreeBadge } from "@/components/system/gree-badge";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { useShoppingListStore } from "@/domains/list/store";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils/cn";

/** Shopping list — persistent, local, checkable in-store. Never leaves the device. */
export function ListClient() {
  const t = useTranslations("list");
  const mounted = useMounted();
  const { items, hydrated, ensureHydrated, add, toggle, remove, setQuantity, clearChecked } = useShoppingListStore();
  const [draft, setDraft] = useState("");

  useEffect(() => ensureHydrated(), [ensureHydrated]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    add({ name, source: "manual" });
    setDraft("");
  };

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      <form onSubmit={submit} className="mb-4 flex gap-2">
        <label htmlFor="list-add" className="sr-only">{t("addLabel")}</label>
        <input
          id="list-add"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("addPlaceholder")}
          className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 text-sm shadow-soft placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-natural-strong"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="gc-pressable inline-flex h-12 shrink-0 items-center gap-1.5 rounded-2xl bg-natural-grad px-4 text-sm font-semibold text-white shadow-raised disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden /> {t("add")}
        </button>
      </form>

      {mounted && hydrated && items.length === 0 && (
        <GreeCard>
          <GreeCardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <svg width="72" height="72" viewBox="0 0 96 96" aria-hidden>
              <ellipse cx="48" cy="80" rx="30" ry="6" className="fill-pastel-mint" />
              <path d="M48 78 C 47 60, 46 46, 48 32" fill="none" stroke="rgb(var(--gc-deep))" strokeWidth="3" strokeLinecap="round" />
              <path d="M48 48 C 38 44, 30 36, 28 26 C 40 29, 47 37, 48 46 Z" className="fill-pastel-sage" />
              <path d="M48 36 C 58 32, 64 24, 66 14 C 55 17, 49 25, 48 34 Z" fill="rgb(var(--gc-natural))" />
            </svg>
            <p className="max-w-xs text-sm text-muted">{t("empty")}</p>
            <Link href="/scan" className="gc-pressable inline-flex h-11 items-center gap-2 rounded-2xl bg-surface-2 px-4 text-sm font-semibold">
              <ScanLine className="h-4 w-4 text-natural-strong" aria-hidden /> {t("emptyCta")}
            </Link>
          </GreeCardContent>
        </GreeCard>
      )}

      {mounted && items.length > 0 && (
        <GreeCard>
          <GreeCardContent className="py-2">
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    id={`li-${item.id}`}
                    checked={item.checked}
                    onChange={() => toggle(item.id)}
                    className="h-6 w-6 shrink-0 accent-[rgb(var(--gc-natural-strong))]"
                  />
                  {(item.imageUrl !== undefined || item.barcode) && (
                    <ProductThumbnail src={item.imageUrl} size="sm" className="h-9 w-9 shrink-0" />
                  )}
                  <label
                    htmlFor={`li-${item.id}`}
                    className={cn("min-w-0 flex-1 truncate text-sm font-medium", item.checked && "text-muted line-through")}
                  >
                    {item.barcode ? (
                      <Link href={`/product/${item.barcode}`} className="hover:underline">{item.name}</Link>
                    ) : (
                      item.name
                    )}
                  </label>
                  {item.grade && (
                    <GreeBadge size="sm" tone={item.grade === "A" || item.grade === "B" ? "positive" : item.grade === "C" ? "caution" : "negative"}>
                      {item.grade}
                    </GreeBadge>
                  )}
                  {/* quantity stepper */}
                  <div className="flex shrink-0 items-center gap-1 rounded-full bg-surface-2 p-0.5">
                    <button
                      onClick={() => setQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label={t("decrease", { name: item.name })}
                      className="gc-pressable grid h-7 w-7 place-items-center rounded-full text-muted disabled:opacity-40"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold tabular-nums" aria-live="polite">{item.quantity}</span>
                    <button
                      onClick={() => setQuantity(item.id, item.quantity + 1)}
                      aria-label={t("increase", { name: item.name })}
                      className="gc-pressable grid h-7 w-7 place-items-center rounded-full text-muted"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                  <button
                    onClick={() => remove(item.id)}
                    aria-label={t("remove", { name: item.name })}
                    className="gc-pressable grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </GreeCardContent>
        </GreeCard>
      )}

      {mounted && checkedCount > 0 && (
        <button onClick={clearChecked} className="gc-pressable mt-3 text-sm font-semibold text-natural-strong">
          {t("clearChecked", { count: checkedCount })}
        </button>
      )}

      <p className="mt-6 text-xs text-muted">{t("localNote")}</p>
    </div>
  );
}
