/**
 * Premium page heading — tight tracking, subtle brand accent bar,
 * consistent across every page.
 */
export function PageHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 animate-fade-up">
      <span aria-hidden className="mb-2.5 block h-1 w-8 rounded-full bg-natural-grad" />
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted md:text-base">{subtitle}</p>}
    </div>
  );
}
