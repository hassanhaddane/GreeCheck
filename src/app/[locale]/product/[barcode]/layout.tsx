import type { Metadata } from "next";
import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { fetchProductByBarcode } from "@/services/api/openfoodfacts";
import { localizedAlternates, SITE_URL } from "@/lib/seo";
import { routing, type Locale } from "@/i18n/routing";
import type { Product } from "@greecheck/domain/product/model";

const getPublicProduct = cache(async (barcode: string) => {
  const code = barcode.replace(/\D/g, "");
  if (code.length < 6) return undefined;
  try {
    const result = await fetchProductByBarcode(code);
    return result.status === "not_found" ? undefined : result;
  } catch {
    return undefined;
  }
});

function indexable(product: Product, status: string) {
  return status === "complete" && Boolean(product.name && product.dataQuality?.confidence === "high");
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; barcode: string }> }): Promise<Metadata> {
  const { locale: rawLocale, barcode } = await params;
  const locale = routing.locales.includes(rawLocale as Locale) ? rawLocale as Locale : routing.defaultLocale;
  const result = await getPublicProduct(barcode);
  const canonicalPath = `/product/${encodeURIComponent(barcode.replace(/\D/g, ""))}`;

  if (!result || !indexable(result.product, result.status)) {
    return {
      robots: { index: false, follow: true },
      alternates: { canonical: `${SITE_URL}/${locale}${canonicalPath}`, languages: localizedAlternates(canonicalPath) }
    };
  }

  const t = await getTranslations({ locale, namespace: "product" });
  const title = t("metaTitle", { name: result.product.name });
  const description = t("metaDescription", { name: result.product.name });
  const canonical = `${SITE_URL}/${locale}${canonicalPath}`;
  const images = result.product.imageUrl ? [{ url: result.product.imageUrl, alt: result.product.name }] : undefined;

  return {
    title,
    description,
    alternates: { canonical, languages: localizedAlternates(canonicalPath) },
    robots: { index: true, follow: true },
    openGraph: { type: "website", url: canonical, siteName: "GreeCheck", title, description, images },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images: images?.map((image) => image.url) }
  };
}

function productJsonLd(product: Product) {
  const gtinKey = product.barcode.length === 8 ? "gtin8" : product.barcode.length === 13 ? "gtin13" : "gtin";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.imageUrl ? [product.imageUrl] : undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    sku: product.barcode,
    [gtinKey]: product.barcode,
    category: product.categories?.join(", "),
    additionalProperty: [
      product.nutriScore ? { "@type": "PropertyValue", name: "Nutri-Score", value: product.nutriScore.toUpperCase() } : undefined,
      product.novaGroup ? { "@type": "PropertyValue", name: "NOVA", value: product.novaGroup } : undefined,
      product.greenScore ? { "@type": "PropertyValue", name: "Green-Score", value: product.greenScore.toUpperCase() } : undefined
    ].filter(Boolean)
  };
}

export default async function ProductLayout({ children, params }: { children: React.ReactNode; params: Promise<{ barcode: string }> }) {
  const { barcode } = await params;
  const result = await getPublicProduct(barcode);
  const structured = result && indexable(result.product, result.status) ? productJsonLd(result.product) : undefined;

  return (
    <>
      {structured && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }}
        />
      )}
      {children}
    </>
  );
}
