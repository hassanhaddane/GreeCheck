"use client";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({ title = "Une erreur est survenue", description, onRetry, retryLabel = "Réessayer", className }: ErrorStateProps) {
  return (
    <div className={cn("gc-card flex flex-col items-center gap-3 border-score-e/25 bg-score-e/5 px-6 py-12 text-center", className)}>
      <span className="grid h-16 w-16 place-items-center rounded-3xl bg-score-e/10 text-score-e">
        <AlertTriangle className="h-7 w-7" strokeWidth={2} />
      </span>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        {description && <p className="mx-auto max-w-xs text-sm text-muted">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="soft" size="sm" onClick={onRetry}>
          <RotateCw className="h-4 w-4" /> {retryLabel}
        </Button>
      )}
    </div>
  );
}
