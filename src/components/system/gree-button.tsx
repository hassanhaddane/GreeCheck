import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const greeButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold gc-pressable transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-natural-strong focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        /** Deep-green primary — the ONE dominant action of a screen. */
        primary: "bg-deep text-white shadow-soft hover:brightness-110",
        /** Neon gradient — motion/success actions only (scan, confirm swap). */
        /** Success/confirm actions: natural at rest — neon glow appears only on hover, press or focus (motion rule). */
        neon: "bg-natural-grad text-white shadow-soft hover:shadow-glow active:shadow-glow focus-visible:shadow-glow hover:brightness-105",
        soft: "bg-surface-2 text-ink hover:bg-surface-3",
        outline: "border border-line bg-surface text-ink hover:bg-surface-2",
        ghost: "text-ink hover:bg-surface-2"
      },
      size: {
        sm: "h-9 px-4",
        md: "h-11 px-5",
        lg: "h-14 px-7 text-base",
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
