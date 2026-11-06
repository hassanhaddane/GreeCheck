import assert from "node:assert/strict";
import { test } from "node:test";
import {
  americanBranded, frenchProduct, moroccanProduct, offMissing, offSuccess,
  FR_GTIN, MA_GTIN, US_GTIN, UNKNOWN_GTIN
} from "../../../tests/fixtures/product-sources";
import { GET as productRoute } from "../../app/api/product/[barcode]/route";
import { fetchProductByBarcode, searchByCategory, searchProducts } from "./openfoodfacts";
import { offProduct } from "./off-normalization";
import { asProductResult } from "./product-contracts";
import { fetchUsdaProduct } from "./fallback/usda";
import { getCiqualReference } from "./fallback/ciqual";
import { lookupBarcode, resolveProductSources } from "./sources";
import { retryAfterMs } from "./errors";
import { upstream } from "./upstream";
import { additiveEvidenceFor, ADDITIVE_EVIDENCE_VERSION } from "@greecheck/domain/scoring/additive-evidence";
import { computeGreeScore } from "@greecheck/domain/scoring/gree-score";
import { defaultPreferences } from "@greecheck/domain/criteria/model";
import { nutrientConflicts } from "@greecheck/domain/product/provenance";

test("OFF v3 validates a French identity and records the origin of each fact", async (t) => {
  const fetcher = t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.pathname, "/api/v3/product/" + FR_GTIN);
    assert.equal(url.searchParams.get("product_type"), "food");
    assert.ok(new Headers(init.headers).get("User-Agent")?.includes("GreeCheck"));
    return Response.json(offSuccess(frenchProduct));
  });
  const [result, same] = await Promise.all([lookupBarcode(FR_GTIN), lookupBarcode(FR_GTIN)]);
  assert.equal(result, same);
  assert.equal(fetcher.mock.callCount(), 1);
  assert.equal(await lookupBarcode(FR_GTIN), result);
  assert.equal(fetcher.mock.callCount(), 1);
  assert.equal(result.status, "complete");
  if (result.status === "complete") {
    assert.equal(result.product.nutriScoreVersion, "2023");
    assert.equal(result.product.dataState, "VERIFIED");
    assert.equal(result.product.provenance?.barcode?.validationStatus, "identity_checked");
    assert.equal(result.product.provenance?.allergens?.dataKind, "declared");
    assert.equal(result.product.provenance?.allergens?.originalUpdatedAt, "2025-01-01T00:00:00.000Z");
    assert.equal(result.product.provenance?.allergens?.confidence, "medium");
    assert.equal(result.product.provenance?.["environment.lifecycleScore"]?.dataKind, "category_reference");
    assert.deepEqual(result.product.categories, ["spreads", "hazelnut spreads"]);
    assert.deepEqual(result.product.allergens, ["milk", "nuts"]);
    assert.equal(result.product.greenScore, "c");
  }
});

test("Moroccan v3 fixture preserves Arabic and per-volume data; rejects inequalities and negatives", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json(offSuccess(moroccanProduct)));
  const result = await fetchProductByBarcode(MA_GTIN);
  assert.equal(result.status, "usable_incomplete");
  {
    const p = result.product;
    assert.equal(p.localizedNames?.ar, "مشروب البرتقال");
    assert.equal(p.nutritionBasis, "100ml");
    assert.equal(p.nutriments.salt, 0.06);
    assert.equal(p.nutriments.fiber, undefined);
    assert.equal(p.nutriments.proteins, undefined);
    assert.equal(p.provenance?.["nutriments.salt"]?.dataKind, "computed");
    assert.equal(p.provenance?.["nutriments.fiber"]?.missingReason, "invalid_or_unsupported");
    assert.equal(p.provenance?.greenScore?.validationStatus, "missing");
    assert.equal(p.allergens, undefined);
    assert.equal(p.dataState, "PARTIAL");
  }
});

test("legacy OFF read is an explicit rollback and does not assume a nutrition basis", async (t) => {
  const previous = process.env.OFF_PRODUCT_API_VERSION;
  process.env.OFF_PRODUCT_API_VERSION = "v2";
  t.after(() => { if (previous === undefined) delete process.env.OFF_PRODUCT_API_VERSION; else process.env.OFF_PRODUCT_API_VERSION = previous; });
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.match(url.pathname, /^\/api\/v2\/product\//);
    return Response.json({ status: 1, product: { ...frenchProduct, product_quantity_unit: undefined } });
  });
  const result = await fetchProductByBarcode(FR_GTIN);
  assert.equal(result.status, "complete");
  if (result.status === "complete") {
    assert.equal(result.product.nutritionBasis, undefined);
    assert.equal(result.product.dataState, "PARTIAL");
    assert.equal(result.product.provenance?.barcode?.sourceVersion, "product-api-v2");
  }
});

test("invalid GTIN is rejected before I/O; a documented OFF miss stays unavailable", async (t) => {
  const fetcher = t.mock.method(globalThis, "fetch", async () => Response.json(offMissing(UNKNOWN_GTIN), { status: 404 }));
  const invalid = await productRoute(new Request("http://localhost/api/product/6111234567890"), { params: Promise.resolve({ barcode: "1234567890124" }) });
  assert.equal(invalid.status, 400);
  assert.equal(fetcher.mock.callCount(), 0);
  const result = await fetchProductByBarcode(UNKNOWN_GTIN);
  assert.deepEqual(result, { status: "not_found", barcode: UNKNOWN_GTIN });
});

test("OFF rejects wrong identity, malformed envelopes and fake 404s", async (t) => {
  const fetcher = t.mock.method(globalThis, "fetch", async () => Response.json(offSuccess(moroccanProduct)));
  await assert.rejects(fetchProductByBarcode(FR_GTIN), { code: "invalid_payload" });
  fetcher.mock.mockImplementation(async () => new Response("<h1>Bad gateway</h1>", { status: 404 }));
  await assert.rejects(fetchProductByBarcode(FR_GTIN), { code: "invalid_payload" });
  fetcher.mock.mockImplementation(async () => Response.json({ product: {} }));
  await assert.rejects(fetchProductByBarcode(FR_GTIN), { code: "invalid_payload" });
});

test("USDA requires exact GTIN in search and details and keeps units and attribution", async (t) => {
  const fetcher = t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.searchParams.get("api_key"), "fixture-key");
    assert.equal(init.cache, "no-store");
    return url.pathname.endsWith("foods/search")
      ? Response.json({ foods: [{ ...americanBranded, gtinUpc: FR_GTIN, fdcId: 23 }, americanBranded] })
      : Response.json(americanBranded);
  });
  const result = await fetchUsdaProduct(US_GTIN, "fixture-key");
  assert.equal(fetcher.mock.callCount(), 2);
  assert.notEqual(result.status, "not_found");
  if (result.status !== "not_found") {
    const p = result.product;
    assert.equal(p.barcode, US_GTIN);
    assert.equal(p.source, "usda");
    assert.equal(p.nutritionBasis, "100g");
    assert.equal(p.nutriments.salt, 1.2);
    assert.equal(p.provenance?.["nutriments.salt"]?.dataKind, "computed");
    assert.match(p.provenance?.barcode?.sourceUrl ?? "", /410122/);
    assert.doesNotMatch(JSON.stringify(result), /fixture-key/);
    assert.equal(p.nutriScore, undefined);
    assert.equal(computeGreeScore(p, defaultPreferences).status, "unscored");
  }
});

test("USDA refuses a lookalike and rejects an identity mismatch after search", async (t) => {
  const fetcher = t.mock.method(globalThis, "fetch", async () => Response.json({ foods: [{ ...americanBranded, gtinUpc: FR_GTIN }] }));
  assert.equal((await fetchUsdaProduct(US_GTIN, "fixture-key")).status, "not_found");
  assert.equal(fetcher.mock.callCount(), 1);
  fetcher.mock.mockImplementation(async (input) => new URL(String(input)).pathname.endsWith("foods/search")
    ? Response.json({ foods: [americanBranded] })
    : Response.json({ ...americanBranded, gtinUpc: FR_GTIN }));
  await assert.rejects(fetchUsdaProduct(US_GTIN, "fixture-key"), { code: "invalid_payload" });
});

test("a partial exact OFF match retains its facts and reports separately sourced conflicts", async () => {
  const p = offProduct({ ...frenchProduct, code: US_GTIN, nutriscore_grade: undefined }, "v3", US_GTIN)!;
  const q = offProduct({ ...frenchProduct, code: US_GTIN, nutriments: { sugars_100g: 20 } }, "test-secondary", US_GTIN)!;
  const incoming = q.provenance?.["nutriments.sugars"];
  assert.ok(incoming);
  incoming.sourceId = "usda";
  q.source = "usda";
  const result = await resolveProductSources(US_GTIN, async () => asProductResult(p), async () => asProductResult(q));
  assert.equal(result.status, "usable_incomplete");
  {
    assert.equal(result.product.dataState, "CONFLICTED");
    assert.equal(result.product.nutriments.sugars, 55);
    assert.equal(result.product.conflicts?.[0].secondary.value, 20);
    assert.equal(result.product.conflicts?.[0].secondary.provenance.sourceId, "usda");
  }
  assert.deepEqual(nutrientConflicts(p, { ...q, nutritionBasis: "100ml" }), []);
  assert.deepEqual(nutrientConflicts(p, { ...q, barcode: FR_GTIN }), []);
});

test("USDA fallback handles an OFF miss but never masks primary outages", async () => {
  const primary = async () => ({ status: "not_found", barcode: US_GTIN } as const);
  const secondary = async () => asProductResult({ ...offProduct({ ...frenchProduct, code: US_GTIN }, "test")!, source: "usda" });
  assert.equal((await resolveProductSources(US_GTIN, primary)).status, "not_found");
  const found = await resolveProductSources(US_GTIN, primary, secondary);
  assert.ok(found.status !== "not_found" && found.product.source === "usda");
  await assert.rejects(resolveProductSources(US_GTIN, async () => { throw new Error("offline"); }, secondary), /offline/);
});

test("configured USDA is wired into the barcode lookup after an exact OFF miss", async (t) => {
  const previous = process.env.USDA_FDC_API_KEY;
  process.env.USDA_FDC_API_KEY = "fixture-key";
  t.after(() => { if (previous === undefined) delete process.env.USDA_FDC_API_KEY; else process.env.USDA_FDC_API_KEY = previous; });
  const fetcher = t.mock.method(globalThis, "fetch", async (url: URL) => {
    if (url.pathname.includes("/api/v3/product/")) return Response.json(offMissing(US_GTIN), { status: 404 });
    assert.equal(url.searchParams.get("api_key"), "fixture-key");
    return url.pathname.endsWith("foods/search") ? Response.json({ foods: [americanBranded] }) : Response.json(americanBranded);
  });
  const result = await lookupBarcode(US_GTIN);
  assert.ok(result.status !== "not_found" && result.product.source === "usda");
  assert.equal(fetcher.mock.callCount(), 3);
  assert.doesNotMatch(JSON.stringify(result), /fixture-key/);
});

test("search uses local language with documented text and structured endpoints", async (t) => {
  const fetcher = t.mock.method(globalThis, "fetch", async (url: URL) => {
    if (url.pathname === "/search") {
      assert.equal(url.searchParams.get("langs"), "ar,en,fr");
      return Response.json({ count: 1, hits: [moroccanProduct] });
    }
    assert.equal(url.pathname, "/api/v2/search");
    assert.equal(url.searchParams.get("categories_tags"), "en:beverages");
    return Response.json({ count: 1, products: [moroccanProduct] });
  });
  const results = await searchProducts("مشروب", 1, 20, "ar");
  assert.equal(results.products[0].localizedNames?.ar, "مشروب البرتقال");
  assert.equal((await searchByCategory("en:beverages")).products.length, 1);
  assert.equal(fetcher.mock.callCount(), 2);
});

test("429, 503, HTTP-date Retry-After and network failure remain distinct", async (t) => {
  const url = new URL("https://fixture.invalid");
  const fetcher = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 429, headers: { "Retry-After": "2" } }));
  const request = upstream(1);
  await assert.rejects(request(url, {}, 100), { code: "rate_limited", retryAfterMs: 2000 });
  await assert.rejects(request(url, {}, 100), { code: "rate_limited" });
  assert.equal(fetcher.mock.callCount(), 1);

  fetcher.mock.mockImplementation(async () => new Response(null, { status: 503, headers: { "Retry-After": "5" } }));
  await assert.rejects(upstream(1)(url, {}, 100), { code: "unavailable", retryAfterMs: 5000 });
  assert.equal(retryAfterMs("Wed, 01 Jan 2025 00:00:10 GMT", Date.parse("2025-01-01")), 10_000);

  fetcher.mock.mockImplementation(async () => { throw new TypeError("sensitive URL"); });
  await assert.rejects(upstream(1)(url, {}, 100), { code: "network", message: "Upstream request failed" });
});

test("Ciqual is category-only and scientific references are explicit and versioned", () => {
  const carrots = getCiqualReference("carrots");
  assert.equal(carrots?.provenance.dataKind, "category_reference");
  assert.equal(carrots?.nutriments.saturatedFat, undefined);
  assert.equal(getCiqualReference(FR_GTIN), undefined);
  assert.equal(getCiqualReference("carrot cake"), undefined);
  assert.match(ADDITIVE_EVIDENCE_VERSION, /^AE-/);
  assert.equal(additiveEvidenceFor("en:e250")?.authority, "ANSES");
  assert.equal(additiveEvidenceFor("e249")?.issuedAt, "2022-07-06");
  assert.equal(additiveEvidenceFor("E 951")?.authority, "EFSA");
  assert.equal(additiveEvidenceFor("e999")?.url, undefined);
});

test("OFF 2023 points cannot bypass estimated provenance or unknown beverage sweeteners", () => {
  const flat = { nutriscore_version: "2023", nutriscore_grade: "e", nutriscore_score: 12 };
  const response = {
    ...moroccanProduct, ...flat, ingredients_text: undefined,
    nutriscore: { "2023": { nutriscore_computed: 1, grade: "e", score: 12, data: {
      is_beverage: 1, is_water: 0, components: { negative: [{ id: "non_nutritive_sweeteners", value: 0 }] }
    } } }
  };
  const unknown = offProduct(response, "v3", MA_GTIN)!;
  assert.equal(unknown.nonNutritiveSweeteners, undefined);
  assert.equal(computeGreeScore(unknown, defaultPreferences).status, "unscored");
  const declared = offProduct({ ...response, ingredients_text: "Eau, sucre" }, "v3", MA_GTIN)!;
  assert.equal(declared.nonNutritiveSweeteners, false);
  assert.equal(computeGreeScore(declared, defaultPreferences).status, "scored");
  const estimated = offProduct({
    ...response, ingredients_text: "Eau, sucre",
    nutriscore: { "2023": { ...response.nutriscore["2023"], estimated: 1 } }
  }, "v3", MA_GTIN)!;
  assert.equal(estimated.nutriScore2023?.referenceOnly, true);
  assert.equal(computeGreeScore(estimated, defaultPreferences).status, "unscored");
});
