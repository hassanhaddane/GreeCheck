"use client";

import { useTranslations } from "next-intl";
import { Leaf, BadgeCheck, Sprout, Wheat, Salad } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type LabelKind = "bio" | "halal" | "vegan" | "vegetarian" | "gluten_free";

const MAP: Record<LabelKind, { icon: typeof Leaf; tone: string }> = {
  bio: { icon: Leaf, tone: "text-natural-strong bg-natural/10 border-natural/25" },
  halal: { icon: BadgeCheck, tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/25" },
  vegan: { icon: Sprout, tone: "text-teal-600 bg-teal-500/10 border-teal-500/25" },
  vegetarian: { icon: Salad, tone: "text-lime-600 bg-lime-500/10 border-lime-500/25" },
  gluten_free: { icon: Wheat, tone: "text-amber-600 bg-amber-500/10 border-amber-500/25" }
};

export function LabelBadge({ kind, label, className }: { kind: LabelKind; label?: string; className?: string }) {
  const t = useTranslations("labels");
  const cfg = MAP[kind];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold", cfg.tone, className)}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
      {label ?? t(kind)}
    </span>
  );
}
