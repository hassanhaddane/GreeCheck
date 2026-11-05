/**
 * Premium page heading — tight tracking, subtle brand accent bar,
 * consistent across every page.
 */
export function PageHeading({ title, subtitle, as: Heading = "h1" }: { title: string; subtitle?: string; as?: "h1" | "h2" }) {
  return (
    <div className="mb-4">
      <Heading className="gc-editorial text-[clamp(1.85rem,4vw,2.75rem)]">{title}</Heading>
      {subtitle && <p className="mt-1 text-sm text-muted md:text-base">{subtitle}</p>}
    </div>
  );
}
