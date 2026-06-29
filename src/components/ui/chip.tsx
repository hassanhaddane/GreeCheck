"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}
export function Chip({ active, className, ...props }: ChipProps) {
  return <button type="button" data-active={active} className={cn("gc-chip gc-pressable", className)} {...props} />;
}
