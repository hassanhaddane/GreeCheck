"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/routing";

/** Desktop top-bar global search — search is always one keystroke away. */
export function GlobalSearch() {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");

  // The search page has its own dominant search field.
  if (pathname === "/search") return null;

  return (
    <form
      role="search"
      aria-label={t("searchLabel")}
      className="hidden max-w-xs flex-1 items-center gap-2 rounded-2xl border border-line bg-surface-2/60 px-3 md:flex"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search");
        setQ("");
      }}
    >
      <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("searchLabel")}
        aria-label={t("searchLabel")}
        className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
    </form>
  );
}
