"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * FloatingAction — sticky glass dock for primary page actions.
 * Sits above the bottom nav on mobile, near the bottom on desktop.
 */
export function FloatingAction({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("sticky bottom-24 z-30 md:bottom-4", className)} {...props}>
      <div className="gc-glass gc-edge rounded-3xl p-2.5 shadow-glass">{children}</div>
    </div>
  );
}
