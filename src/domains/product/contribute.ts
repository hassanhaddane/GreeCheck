/**
 * Open Food Facts contribution links — GreeCheck never invents product data;
 * it points users to the collaborative source instead.
 */
const OFF_HOSTS: Record<string, string> = { fr: "fr", ar: "world", en: "world" };

function host(locale?: string): string {
  return OFF_HOSTS[locale ?? ""] ?? "world";
}

/** Edit/complete an existing product sheet. */
export function productContributionUrl(barcode: string, locale?: string): string {
  const code = barcode.replace(/\D/g, "");
  return `https://${host(locale)}.openfoodfacts.org/cgi/product.pl?type=edit&code=${code}`;
}

/** Create a missing product sheet. */
export function productAddUrl(barcode: string, locale?: string): string {
  const code = barcode.replace(/\D/g, "");
  return `https://${host(locale)}.openfoodfacts.org/cgi/product.pl?type=add&code=${code}`;
}
