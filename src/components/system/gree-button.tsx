import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const greeButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-center text-sm leading-snug font-semibold gc-pressable transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-strong focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        /** Deep-green primary — the ONE dominant action of a screen. */
        primary: "bg-deep text-white shadow-soft hover:brightness-110",
        /** High-emphasis scan and confirmation. */
        neon: "bg-deep text-white hover:brightness-110 active:brightness-95",
        soft: "bg-surface-2 text-ink hover:bg-surface-3",
        outline: "border border-line bg-surface text-ink hover:bg-surface-2",
        ghost: "text-ink hover:bg-surface-2"
      },
      size: {
        sm: "min-h-9 px-3 py-1.5",
        md: "min-h-11 px-4 py-2",
        lg: "min-h-12 px-5 py-2 text-base",
        icon: "h-11 w-11"
      }
    },
    defaultVariants: { variant: "primary", size: "md" }
  }
);

export interface GreeButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof greeButtonVariants> {}

export const GreeButton = React.forwardRef<HTMLButtonElement, GreeButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(greeButtonVariants({ variant, size }), className)} {...props} />
  )
);
GreeButton.displayName = "GreeButton";
export { greeButtonVariants };
