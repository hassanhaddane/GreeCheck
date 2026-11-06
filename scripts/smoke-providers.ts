import { fetchProductByBarcode, searchByCategory, searchProducts } from "../src/services/api/openfoodfacts";
import { fetchUsdaProduct } from "../src/services/api/fallback/usda";
import { normalizeError } from "../src/services/api/errors";
import { GET as searchPlaces } from "../src/app/api/places/route";
import { gtinIdentity } from "../packages/domain/src/product/gtin";

if (process.env.GREECHECK_LIVE_SMOKE !== "1") {
  throw new Error("Set GREECHECK_LIVE_SMOKE=1 for an explicit, low-frequency live run.");
}

async function check(label: string, run: () => Promise<boolean>) {
  try {
    if (!await run()) {
      console.error(label + " INCONCLUSIVE (empty result or unexpected identity)");
      process.exitCode = 1;
      return;
    }
    console.log(label + " OK");
  } catch (error) {
    const normalized = normalizeError(error);
    console.error(label + " FAILED (" + normalized.code + ")");
    process.exitCode = 1;
  }
}

async function main() {
  await check("OFF product", async () => {
    const barcode = "3017620422003";
    const result = await fetchProductByBarcode(barcode);
    return "product" in result && result.product.barcode === barcode && result.product.source === "openfoodfacts";
  });
  await check("OFF text", async () => (await searchProducts("Nutella", 1, 5, "fr")).products.length > 0);
  await check("OFF category", async () => (await searchByCategory("en:hazelnut-spreads", 5)).products.length > 0);

  if (process.env.GREECHECK_SMOKE_OVERPASS === "1") {
    await check("Overpass public place fixture", async () => {
      const response = await searchPlaces(new Request("http://localhost/api/places?lat=48.86&lon=2.35&types=supermarket"));
      if (!response.ok) return false;
      const body = await response.json();
      return Array.isArray(body.places) && body.places.length > 0;
    });
  } else {
    console.log("Overpass SKIP (explicit GREECHECK_SMOKE_OVERPASS=1 required)");
  }

  const key = process.env.USDA_FDC_API_KEY?.trim();
  const barcode = process.env.USDA_SMOKE_GTIN?.trim();
  if (!key || !barcode || !gtinIdentity(barcode)) {
    console.log("USDA SKIP (requires server key and a known, valid USDA_SMOKE_GTIN)");
  } else {
    await check("USDA exact product", async () => {
      const result = await fetchUsdaProduct(barcode, key);
      return "product" in result && result.product.barcode === barcode && result.product.source === "usda";
    });
  }
}

void main();
