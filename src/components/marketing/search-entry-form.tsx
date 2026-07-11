"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "@/i18n/routing";

/**
 * Desktop hero search — the primary desktop entry into the app.
 * Client-side navigation keeps the transition smooth; a plain submit still
 * works as a normal navigation for keyboard/enter users.
 */
export function SearchEntryForm({ placeholder, label }: { placeholder: string; label: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      role="search"
      aria-label={label}
      className="flex w-full items-center gap-2 rounded-3xl border border-line bg-surface p-1.5 ps-4 shadow-raised"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search");
      }}
    >
      <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
      <button type="submit" className="gc-pressable inline-flex h-11 items-center gap-2 rounded-2xl bg-deep px-5 text-sm font-semibold text-white">
        {label}
      </button>
    </form>
  );
}
