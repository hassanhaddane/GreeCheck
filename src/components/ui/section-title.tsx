import { cn } from "@/lib/utils/cn";

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("mb-3 px-1 text-sm font-semibold uppercase tracking-wide text-muted", className)}>
      {children}
    </h2>
  );
}
