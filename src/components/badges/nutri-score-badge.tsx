import { cn } from "@/lib/utils/cn";
import { NUTRI_COLORS, NUTRI_TEXT_DARK } from "@/lib/constants/badges";

const GRADES = ["a", "b", "c", "d", "e"] as const;

interface Props {
  grade?: string;
  /** "segmented" shows the full A–E scale, "compact" shows a single chip */
  variant?: "segmented" | "compact";
  className?: string;
}

export function NutriScoreBadge({ grade, variant = "segmented", className }: Props) {
  const g = (grade ?? "").toLowerCase();

  if (variant === "compact") {
    const color = NUTRI_COLORS[g] ?? "rgb(var(--gc-muted))";
    return (
      <span
        className={cn(
          "grid h-8 w-8 place-items-center rounded-xl text-sm font-extrabold",
          NUTRI_TEXT_DARK.has(g) ? "text-deep" : "text-white",
          className
        )}
        style={{ backgroundColor: color }}
        aria-label={`Nutri-Score ${g.toUpperCase()}`}
      >
        {g ? g.toUpperCase() : "?"}
      </span>
    );
  }

  return (
    <div
      className={cn("inline-flex overflow-hidden rounded-xl shadow-soft", className)}
      role="img"
      aria-label={`Nutri-Score ${g.toUpperCase()}`}
    >
      {GRADES.map((letter) => {
        const active = letter === g;
        return (
          <span
            key={letter}
            className={cn(
              "grid place-items-center font-extrabold transition-all",
              active ? "h-9 w-9 text-base" : "h-9 w-7 text-xs opacity-35"
            )}
            style={{
              backgroundColor: NUTRI_COLORS[letter],
              color: NUTRI_TEXT_DARK.has(letter) ? "#101312" : "#fff"
            }}
          >
            {letter.toUpperCase()}
          </span>
        );
      })}
    </div>
  );
}
