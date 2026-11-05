"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { PRIMARY_NAV } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";

export function PrimaryNav({ mobile = false }: { mobile?: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("primary")} className={mobile ? "mx-auto grid max-w-lg grid-cols-3 gap-1" : "hidden min-w-0 flex-wrap items-center gap-1 py-1 md:flex"}>
      {PRIMARY_NAV.map(({ key, href, icon: Icon, primary }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "gc-pressable flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2.5 font-semibold transition-colors",
              mobile ? "min-h-[3.25rem] flex-col py-1.5 text-xs" : "min-h-10 text-sm [&>svg]:hidden lg:[&>svg]:block",
              primary ? "bg-deep text-white hover:bg-deep/90"
                : active ? "bg-pastel-sage text-ink" : "text-muted hover:bg-surface-2 hover:text-ink",
              active && "underline decoration-2 underline-offset-4"
            )}
          >
            <Icon aria-hidden className={mobile ? "h-5 w-5 shrink-0" : "h-4 w-4 shrink-0"} />
            <span className="text-center leading-tight">{t(key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  return (
    <div className="gc-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg px-3 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] md:hidden">
      <PrimaryNav mobile />
    </div>
  );
}
