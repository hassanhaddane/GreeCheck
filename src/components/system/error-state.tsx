import { useTranslations } from "next-intl";
import { AlertTriangle, RotateCw } from "lucide-react";
import { GreeButton } from "./gree-button";
import { GreeIcon } from "./gree-icon";
import { cn } from "@/lib/utils/cn";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** Honest error state: what happened + one recovery action. */
export function ErrorState({ title, description, onRetry, retryLabel, className }: ErrorStateProps) {
  const t = useTranslations("common");
  return (
    <div className={cn("gc-card flex flex-col items-center gap-3 border-score-e/25 bg-score-e/5 px-6 py-12 text-center", className)}>
      <GreeIcon icon={AlertTriangle} tone="negative" size="lg" className="h-16 w-16 rounded-3xl" />
      <div className="space-y-1">
        <p className="gc-heading">{title ?? t("error")}</p>
        {description && <p className="gc-body mx-auto max-w-xs text-muted">{description}</p>}
      </div>
      {onRetry && (
        <GreeButton variant="soft" size="sm" onClick={onRetry}>
          <RotateCw className="h-4 w-4" /> {retryLabel ?? t("retry")}
        </GreeButton>
      )}
    </div>
  );
}
