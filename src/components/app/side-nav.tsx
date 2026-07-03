"use client";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { BOTTOM_NAV, SECONDARY_NAV } from "@/lib/constants/navigation";
import { PrivacyPill } from "@/components/ui/privacy-pill";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Desktop sidebar — quiet glass rail with an animated active indicator. */
export function SideNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = [...BOTTOM_NAV, ...SECONDARY_NAV];

  const linkClass = (active: boolean) =>
    cn(
      "gc-pressable relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
      active ? "text-deep dark:text-neon" : "text-muted hover:bg-surface-2 hover:text-ink"
    );

  const activePill = (
    <motion.span
      layoutId="side-pill"
      className="absolute inset-0 -z-10 rounded-2xl bg-surface shadow-soft ring-1 ring-natural/20"
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
    />
  );

  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col gap-1 py-6 md:flex">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link key={item.key} href={item.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
            {active && activePill}
            <span
              className={cn(
                "grid h-8 w-8 place-items-center rounded-xl transition",
                active ? "bg-neon-grad text-deep shadow-glow" : "bg-surface-2 text-muted"
              )}
            >
              <Icon className="h-[1.1rem] w-[1.1rem]" strokeWidth={active ? 2.4 : 2} />
            </span>
            {t(item.key)}
          </Link>
        );
      })}
      <div className="mt-auto space-y-3 px-1">
        <Link
          href="/settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className={linkClass(pathname.startsWith("/settings"))}
        >
          {pathname.startsWith("/settings") && activePill}
          <span className={cn("grid h-8 w-8 place-items-center rounded-xl", pathname.startsWith("/settings") ? "bg-neon-grad text-deep shadow-glow" : "bg-surface-2 text-muted")}>
            <Settings className="h-[1.1rem] w-[1.1rem]" />
          </span>
          {t("settings")}
        </Link>
        <PrivacyPill className="w-full justify-center" />
      </div>
    </aside>
  );
}
