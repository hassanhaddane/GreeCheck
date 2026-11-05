import { cn } from "@/lib/utils/cn";

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

/** GreeCheck mark — forest-green tile with a leaf-check glyph. */
export function Logo({ size = 36, withWordmark = false, className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className="grid place-items-center rounded-xl bg-deep"
        style={{ width: size, height: size }}
      >
        <svg aria-hidden="true" width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6.5C16 4 8.5 4.5 5.5 9c-2.4 3.6-1 8.4 3 10.2"
            stroke="var(--gc-ticket-accent)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path d="M8.5 12.5l3 3 6-6.5" stroke="var(--gc-ticket-accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {withWordmark && (
        <span className="text-lg font-bold tracking-tight">
          Gree<span className="text-natural-strong">Check</span>
        </span>
      )}
    </span>
  );
}
