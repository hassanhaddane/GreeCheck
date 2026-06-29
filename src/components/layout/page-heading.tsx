export function PageHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 animate-fade-up">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted md:text-base">{subtitle}</p>}
    </div>
  );
}
