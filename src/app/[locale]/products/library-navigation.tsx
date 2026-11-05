"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

const views = [
  { key: "history", href: "/products" },
  { key: "favorites", href: "/products/favorites" }
] as const;

export function LibraryNavigation() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("products")} className="mb-6 flex flex-wrap gap-2">
      {views.map(({ key, href }) => (
        <Link
          key={key}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={cn(
            "gc-pressable inline-flex min-h-11 items-center rounded-2xl border px-4 text-sm font-semibold",
            pathname === href ? "border-transparent bg-deep text-white" : "border-line bg-surface text-muted"
          )}
        >
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
