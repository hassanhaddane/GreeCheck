"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "./card";

interface Props {
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** Premium collapsible card — keeps the product sheet scannable, details on demand. */
export function CollapsibleSection({ title, icon, badge, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-5 text-left gc-pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/50"
      >
        {icon && <span className="text-natural">{icon}</span>}
        <span className="flex-1 font-semibold tracking-tight">{title}</span>
        {badge}
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
