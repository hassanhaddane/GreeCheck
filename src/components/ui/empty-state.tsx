import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("gc-card flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <span className="grid h-16 w-16 place-items-center rounded-3xl bg-surface-2 text-natural">
        <Icon className="h-7 w-7" strokeWidth={2} />
      </span>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        {description && <p className="mx-auto max-w-xs text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
