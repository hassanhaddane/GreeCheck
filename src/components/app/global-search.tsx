"use client";
import Form from "next/form";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Search } from "lucide-react";
import { getPathname, usePathname, type Locale } from "@/i18n/routing";

/** Desktop top-bar global search — search is always one keystroke away. */
export function GlobalSearch({ home = false }: { home?: boolean }) {
  const t = useTranslations("nav");
  const h = useTranslations("home");
  const locale = useLocale() as Locale;
  const pathname = usePathname();

  // The search page has its own dominant search field.
  if (!home && (pathname === "/search" || pathname === "/")) return null;

  return (
    <Form
      action={getPathname({ locale, href: "/search" })}
      prefetch={false}
      role="search"
      aria-label={t("searchLabel")}
      className={home ? "gc-field flex items-center gap-3 pe-1.5 ps-3.5" : "gc-field hidden w-[clamp(8rem,14vw,12rem)] items-center gap-2 px-3 lg:flex"}
    >
      <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      <input
        name="q"
        placeholder={home ? h("search.placeholder") : t("searchLabel")}
        aria-label={t("searchLabel")}
        type="search"
        autoComplete="off"
        className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted lg:text-sm"
      />
      {home && <button type="submit" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-pastel-sage text-ink hover:bg-surface-3" aria-label={t("search")}><ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden /></button>}
    </Form>
  );
}
