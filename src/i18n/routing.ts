import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const locales = ["fr", "en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const localeMeta: Record<Locale, { label: string; dir: "ltr" | "rtl"; flag: string }> = {
  fr: { label: "Français", dir: "ltr", flag: "🇫🇷" },
  en: { label: "English", dir: "ltr", flag: "🇬🇧" },
  ar: { label: "العربية", dir: "rtl", flag: "🇸🇦" }
};

export const routing = defineRouting({
  locales,
  defaultLocale: "fr",
  localePrefix: "always"
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
