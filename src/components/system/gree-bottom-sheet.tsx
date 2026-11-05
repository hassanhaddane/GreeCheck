"use client";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface GreeBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  ariaLabel?: string;
  closeLabel?: string;
  children: React.ReactNode;
  className?: string;
}

/** Native modal keeps keyboard and assistive-technology focus inside the active sheet. */
export function GreeBottomSheet({ open, onClose, title, ariaLabel, closeLabel, children, className }: GreeBottomSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const overflow = document.body.style.overflow;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <dialog ref={dialogRef} aria-modal="true" aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : ariaLabel}
      className={cn("gc-sheet m-0 max-h-[85dvh] max-w-none overflow-y-auto overscroll-contain rounded-t-3xl bg-surface text-ink shadow-raised md:m-auto md:max-w-lg md:rounded-3xl", className)}
      onKeyDown={event => {
        if (event.key !== "Tab") return;
        const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
        )].filter(element => element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first && last) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last && first) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
        <header className="mb-3 flex items-center gap-2">
          {title && <h2 id={titleId} className="gc-heading">{title}</h2>}
          <button type="button" onClick={onClose} aria-label={closeLabel ?? ariaLabel ?? title}
            className="ms-auto grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink hover:bg-surface-3">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        {children}
      </div>
    </dialog>,
    document.body
  );
}
