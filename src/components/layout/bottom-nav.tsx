"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { BOTTOM_NAV } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto mb-3 flex max-w-md items-center justify-around gc-glass rounded-3xl px-2 py-2 shadow-glass">
        {BOTTOM_NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          if (item.primary) {
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-label={t(item.key)}
                className="gc-pressable -mt-7 grid h-16 w-16 place-items-center rounded-full bg-neon-grad shadow-glow"
              >
                <Icon className="h-7 w-7 text-deep" strokeWidth={2.4} />
              </Link>
            );
          }
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "gc-pressable flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[0.65rem] font-medium",
                active ? "text-natural" : "text-muted"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              {t(item.key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
