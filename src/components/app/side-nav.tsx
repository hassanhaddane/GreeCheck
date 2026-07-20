"use client";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ScanLine, ChevronRight } from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { BOTTOM_NAV, MORE_NAV } from "@/lib/constants/navigation";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { useHistoryStore } from "@/domains/library/history-store";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils/cn";

/**
 * Desktop application rail — deliberately NOT a stretched mobile bar.
 * Optimized for the desktop loop: search → compare → recent products →
 * product details. Hidden on the public marketing home.
 */
export function SideNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const mounted = useMounted();
  const recents = useHistoryStore((s) => s.entries);

  const primary = BOTTOM_NAV.filter((i) => i.key !== "scan");

  const linkClass = (active: boolean) =>
    cn(
      "gc-pressable relative flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition",
      active ? "text-deep dark:text-natural-strong" : "text-muted hover:bg-surface-2 hover:text-ink"
    );

  const activePill = (
    <motion.span
      layoutId="side-pill"
      className="absolute inset-0 -z-10 rounded-2xl bg-surface shadow-soft ring-1 ring-natural/20"
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
    />
  );

  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 flex-col gap-1 overflow-y-auto py-6 md:flex">
      {/* Scan — present but not the desktop hero (search owns the top bar) */}
      <Link
        href="/scan"
        className="gc-pressable mb-3 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-natural-grad text-sm font-semibold text-white shadow-raised"
      >
        <ScanLine className="h-4 w-4" aria-hidden /> {t("scan")}
      </Link>

      {/* Primary destinations */}
      <nav aria-label={t("searchLabel")} className="flex flex-col gap-1">
        {primary.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.key} href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
              {active && activePill}
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-xl transition",
                  active ? "bg-natural-grad text-white shadow-raised" : "bg-surface-2 text-muted"
                )}
              >
                <Icon className="h-[1.1rem] w-[1.1rem]" strokeWidth={active ? 2.4 : 2} />
              </span>
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      {/* Recent products — jump back into comparison/details (real local data) */}
      {mounted && recents.length > 0 && (
        <section className="mt-5">
          <h2 className="gc-overline px-4 pb-1.5">{t("recents")}</h2>
          <ul className="flex flex-col gap-0.5">
            {recents.slice(0, 4).map((e) => (
              <li key={e.barcode}>
                <Link
                  href={`/product/${e.barcode}`}
                  className="gc-pressable flex items-center gap-2.5 rounded-2xl px-4 py-1.5 hover:bg-surface-2"
                >
                  <ProductThumbnail src={e.imageUrl} size="sm" className="h-8 w-8" />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{e.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted rtl:rotate-180" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Compact secondary section */}
      <nav aria-label={t("more")} className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
        {MORE_NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "gc-pressable flex items-center gap-2.5 rounded-xl px-4 py-2 text-xs font-medium",
                active ? "bg-surface text-ink shadow-soft" : "text-muted hover:bg-surface-2 hover:text-ink"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden /> {t(item.key)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
