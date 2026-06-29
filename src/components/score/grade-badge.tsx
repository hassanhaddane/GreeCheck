import { cn } from "@/lib/utils/cn";

const map: Record<string, string> = {
  a: "bg-score-a", b: "bg-score-b", c: "bg-score-c", d: "bg-score-d", e: "bg-score-e"
};

export function GradeBadge({ grade, label }: { grade?: string; label?: string }) {
  const g = (grade ?? "c").toLowerCase();
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs font-medium text-muted">{label}</span>}
      <span className={cn("grid h-7 w-7 place-items-center rounded-lg text-sm font-bold text-white", map[g] ?? "bg-muted")}>
        {(grade ?? "?").toUpperCase()}
      </span>
    </div>
  );
}
