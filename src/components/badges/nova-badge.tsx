import { cn } from "@/lib/utils/cn";
import { NOVA_COLORS } from "@/lib/constants/badges";

export function NovaBadge({ group, className }: { group?: 1 | 2 | 3 | 4; className?: string }) {
  const color = group ? NOVA_COLORS[group] : "rgb(var(--gc-muted))";
  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-xl bg-surface-2 py-1 pe-2.5 ps-1", className)} aria-label={`NOVA ${group ?? "?"}`}>
      <span className="grid h-6 w-6 place-items-center rounded-lg text-xs font-extrabold text-white" style={{ backgroundColor: color }}>
        {group ?? "?"}
      </span>
      <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted">NOVA</span>
    </div>
  );
}
