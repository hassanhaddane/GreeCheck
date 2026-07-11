import type { LucideIcon } from "lucide-react";
import { GreeIcon } from "./gree-icon";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Calm empty state: quiet brand tile, one clear next step. Never an error look. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("gc-card flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <GreeIcon icon={icon} tone="brand" size="lg" className="h-16 w-16 rounded-3xl" />
      <div className="space-y-1">
        <p className="gc-heading">{title}</p>
        {description && <p className="gc-body mx-auto max-w-xs text-muted">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
