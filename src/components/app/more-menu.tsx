"use client";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, ChevronRight } from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { GreeBottomSheet } from "@/components/system/gree-bottom-sheet";
import { LanguageSwitcher } from "./language-switcher";
import { MORE_NAV } from "@/lib/constants/navigation";

export function MoreMenu() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("more")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="gc-pressable grid h-11 w-11 place-items-center rounded-xl text-muted hover:bg-surface-2"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>
      <GreeBottomSheet open={open} onClose={close} title={t("more")} closeLabel={tc("close")}>
        <nav aria-label={t("more")}>
          <ul className="divide-y divide-line">
            {MORE_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    onClick={close}
                    className="gc-pressable flex min-h-11 items-center gap-3 py-1.5"
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
        <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
          <span className="text-sm font-medium text-muted">{t("language")}</span>
          <LanguageSwitcher />
        </div>
      </GreeBottomSheet>
    </>
  );
}
