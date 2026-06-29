import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-surface-2",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-white/40 after:to-transparent dark:after:via-white/5",
        className
      )}
      aria-hidden
    />
  );
}

/** Ready-made product row skeleton used in lists. */
export function ProductRowSkeleton() {
  return (
    <div className="gc-card flex items-center gap-3 p-3">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-11 w-11 rounded-full" />
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-40 w-full rounded-2xl", className)} />;
}
