"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { GreeBottomSheet } from "@/components/system/gree-bottom-sheet";
import { MORE_NAV } from "@/lib/constants/navigation";

/** Compact "More" menu (mobile): secondary destinations in a bottom sheet. */
export function MoreMenu() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("more")}
        aria-haspopup="dialog"
        className="gc-pressable grid h-11 w-11 place-items-center rounded-xl text-muted hover:bg-surface-2 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <GreeBottomSheet open={open} onClose={() => setOpen(false)} title={t("more")} closeLabel={tc("close")}>
        <nav aria-label={t("more")}>
          <ul className="divide-y divide-line">
            {MORE_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="gc-pressable flex items-center gap-3 py-3.5"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="flex-1 text-sm font-medium">{t(item.key)}</span>
                    <ChevronRight className="h-4 w-4 text-muted rtl:rotate-180" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </GreeBottomSheet>
    </>
  );
}
