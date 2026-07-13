"use client";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

/** Discreet, reassuring privacy pill — links to the privacy page. */
export function PrivacyPill({ className, label }: { className?: string; label?: string }) {
  const t = useTranslations("app");
  return (
    <Link
      href="/privacy"
      className={cn(
        "gc-pressable inline-flex items-center gap-1.5 rounded-full border border-natural/20 bg-natural/10 px-3 py-1.5 text-xs font-medium text-natural transition hover:bg-natural/15",
        className
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 truncate">{label ?? t("privacyBadge")}</span>
    </Link>
  );
}
