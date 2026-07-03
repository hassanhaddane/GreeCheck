"use client";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/routing";
import { locales, localeMeta, type Locale } from "@/i18n/routing";
import { useState } from "react";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        aria-label={tc("changeLanguage")}
        onClick={() => setOpen((v) => !v)}
        className="gc-pressable flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm font-semibold hover:bg-surface-2"
      >
        <Languages className="h-5 w-5" />
        <span className="uppercase">{locale}</span>
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => {
                setOpen(false);
                router.replace(pathname, { locale: l });
              }}
              data-active={l === locale}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-surface-2 data-[active=true]:font-semibold data-[active=true]:text-natural"
            >
              <span>{localeMeta[l].flag}</span>
              <span>{localeMeta[l].label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
