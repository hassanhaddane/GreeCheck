"use client";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { BOTTOM_NAV } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Floating premium bottom nav — frosted dock, animated active pill
 * (shared layoutId) and a dominant central scan button with a soft
 * pulsing halo.
 */
export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="gc-glass gc-edge mx-auto mb-3 flex max-w-md items-center justify-around rounded-[1.75rem] px-2 py-2 shadow-glass">
        {BOTTOM_NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          if (item.primary) {
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-label={t(item.key)}
                className="gc-pressable gc-pulse-ring relative -mt-8 grid h-[4.25rem] w-[4.25rem] place-items-center rounded-full bg-natural-grad shadow-raised ring-4 ring-bg"
              >
                <Icon className="h-7 w-7 text-white" strokeWidth={2.4} />
              </Link>
            );
          }
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "gc-pressable relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[0.65rem] font-medium",
                active ? "text-deep dark:text-natural-strong" : "text-muted"
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-x-1.5 inset-y-0.5 -z-10 rounded-2xl bg-natural/10"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              <span className="max-w-full truncate px-0.5">{t(item.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
