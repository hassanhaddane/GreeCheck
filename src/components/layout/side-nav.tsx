"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { BOTTOM_NAV, SECONDARY_NAV } from "@/lib/constants/navigation";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function SideNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = [...BOTTOM_NAV, ...SECONDARY_NAV];

  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col gap-1 p-4 md:flex">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "gc-pressable flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
              active ? "bg-surface text-natural shadow-soft" : "text-muted hover:bg-surface-2"
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
            {t(item.key)}
          </Link>
        );
      })}
      <div className="mt-auto">
        <Link
          href="/settings"
          className={cn(
            "gc-pressable flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
            pathname.startsWith("/settings") ? "bg-surface text-natural shadow-soft" : "text-muted hover:bg-surface-2"
          )}
        >
          <Settings className="h-5 w-5" />
          {t("settings")}
        </Link>
      </div>
    </aside>
  );
}
