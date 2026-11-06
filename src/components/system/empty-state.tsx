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
    <div className={cn("gc-card flex flex-col items-start gap-3 px-4 py-5 text-start sm:px-5", className)}>
      <GreeIcon icon={icon} tone="brand" size="lg" className="h-10 w-10 rounded-xl" />
      <div className="space-y-1">
        <p className="gc-heading">{title}</p>
        {description && <p className="gc-body max-w-prose text-muted">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
