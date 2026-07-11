"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { DUR, EASE } from "./motion";

export interface GreeBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Accessible name when no visible title is rendered. */
  ariaLabel?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * GreeBottomSheet — the app's progressive-disclosure surface.
 * Mobile: slides from the bottom with a grab handle. Desktop: centered panel.
 * Scrim click / Escape / close button dismiss it. Reduced-motion = fade only.
 */
export function GreeBottomSheet({ open, onClose, title, ariaLabel, children, className }: GreeBottomSheetProps) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Focus trap: Tab cycles inside the dialog.
      if (e.key === "Tab") {
        const items = focusables();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === panelRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    // Initial focus goes into the sheet for keyboard/screen-reader users.
    const t = setTimeout(() => panelRef.current?.focus(), 30);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
      document.body.style.overflow = "";
      // Focus restoration to the trigger element.
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.base }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? ariaLabel}
            tabIndex={-1}
            className={cn(
              "relative max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none gc-depth-3",
              "md:max-w-lg md:rounded-3xl md:pb-5",
              className
            )}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: "40%" }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: "40%" }}
            transition={{ duration: DUR.base, ease: EASE.out }}
          >
            <span aria-hidden className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-line md:hidden" />
            <div className="mb-3 flex items-center justify-between gap-3">
              {title && <h2 className="gc-title">{title}</h2>}
              <button
                onClick={onClose}
                aria-label="close"
                className="gc-pressable ms-auto grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
