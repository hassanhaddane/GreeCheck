"use client";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ScanLine } from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { PRIMARY_NAV } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";

export function SideNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const primary = PRIMARY_NAV.filter((i) => i.key !== "scan");

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
    <nav aria-label={t("primary")} className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 flex-col gap-1 overflow-y-auto py-6 md:flex">
      <Link
        href="/scan"
        aria-current={pathname === "/scan" ? "page" : undefined}
        className="gc-pressable mb-3 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-natural-grad text-sm font-semibold text-white shadow-raised"
      >
        <ScanLine className="h-4 w-4" aria-hidden /> {t("scan")}
      </Link>

      {primary.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
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
  );
}
