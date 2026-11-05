"use client";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, icon, badge, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="rounded-xl border border-line bg-surface">
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls={id}
        className="flex min-h-12 w-full items-center gap-2 rounded-xl px-3 py-2.5 text-start sm:px-4">
        {icon && <span aria-hidden className="shrink-0 text-natural-strong [&>svg]:size-4">{icon}</span>}
        <span className="min-w-0 flex-1 text-sm font-semibold sm:text-base">{title}</span>
        {badge}
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div id={id} hidden={!open} className="border-t border-line px-3 py-3 sm:px-4">
        {open && children}
      </div>
    </div>
  );
}
