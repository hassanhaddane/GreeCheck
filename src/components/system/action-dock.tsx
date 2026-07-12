import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * ActionDock — sticky glass dock holding a screen's contextual actions.
 * Sits above the bottom nav on mobile, near the bottom on desktop.
 * One dominant action max; the rest stay quiet (soft/ghost/icon).
 */
export function ActionDock({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative", className)} {...props}>
      <div className="gc-glass gc-edge rounded-3xl p-2.5 shadow-glass">{children}</div>
    </div>
  );
}
