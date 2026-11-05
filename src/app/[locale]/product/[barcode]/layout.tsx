import type { Metadata } from "next";
import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { lookupBarcode } from "@/services/api/sources";
import { localizedAlternates, SITE_URL } from "@/lib/seo";
import { routing, type Locale } from "@/i18n/routing";
import { gtinIdentity } from "@greecheck/domain/product/gtin";
import type { Product } from "@greecheck/domain/product/model";

const getPublicProduct = cache(async (code: string) => {
  if (!gtinIdentity(code)) return undefined;
  try {
    const result = await lookupBarcode(code);
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
  const name = result.product.localizedNames?.[locale] ?? result.product.name;
  const title = t("metaTitle", { name });
  const description = t("metaDescription", { name });
  const canonical = `${SITE_URL}/${locale}${canonicalPath}`;
  const images = result.product.imageUrl ? [{ url: result.product.imageUrl, alt: name }] : undefined;

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

export default async function ProductLayout({ children, params }: { children: React.ReactNode; params: Promise<{ barcode: string; locale: string }> }) {
  const { barcode, locale: rawLocale } = await params;
  const locale = routing.locales.includes(rawLocale as Locale) ? rawLocale as Locale : routing.defaultLocale;
  const result = await getPublicProduct(barcode);
  const structured = result && indexable(result.product, result.status) ? productJsonLd({ ...result.product, name: result.product.localizedNames?.[locale] ?? result.product.name }) : undefined;

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
