"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}
export function Chip({ active, className, ...props }: ChipProps) {
  return <button type="button" data-active={active} aria-pressed={active} className={cn("gc-chip gc-pressable min-h-9", className)} {...props} />;
}
