// Privacy-first contextual ad placeholder (no tracking SDK in V1).
export function AdSlot({ label = "Espace publicitaire" }: { label?: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-line bg-surface-2/50 text-xs font-medium uppercase tracking-wide text-muted">
      {label}
    </div>
  );
}
