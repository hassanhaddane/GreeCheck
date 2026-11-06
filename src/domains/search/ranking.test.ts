/** Confidence-aware search ranking. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rankSearchResults, relevanceScore, searchProviderTerm, type ScoredProduct } from "./ranking";
import { computeGreeScore } from "@greecheck/domain/scoring/gree-score";
import { with2023Points } from "@greecheck/domain/scoring/test-products";
import { defaultPreferences } from "@greecheck/domain/criteria/model";
import type { Product } from "@greecheck/domain/product/model";

const PREFS = { ...defaultPreferences };
function product(o: Partial<Product> = {}): Product {
  return { barcode: Math.random().toString().slice(2, 12), name: "Test", nutriments: {}, source: "openfoodfacts", ...o };
}
const scored = (p: Product): ScoredProduct => ({ p, gree: computeGreeScore(p, PREFS) });

test("relevanceScore rewards name/brand/category token overlap", () => {
  const p = product({ name: "Yaourt nature", brand: "Danone", categories: ["dairy", "yogurts"] });
  assert.ok(relevanceScore("yaourt", p) > 0);
  assert.ok(relevanceScore("yaourt danone", p) >= relevanceScore("yaourt", p));
  assert.equal(relevanceScore("chocolat", p), 0);
});

test("an incomplete product does NOT outrank a well-documented one solely for lacking negatives", () => {
  // Incomplete: official letter A, partial facts → GS-2 grade fallback, MEDIUM
  // confidence, higher raw score (90).
  const incomplete = scored(product({
    name: "Yaourt A", categories: ["yogurts"], nutriScore: "a",
    ingredientsText: "lait, ferments", additives: [],
    nutriments: { sugars: 3, salt: 0.05 }
  }));
  // Complete: full facts → computed points, HIGH confidence, slightly lower (84).
  const complete = scored(with2023Points(product({
    name: "Yaourt B", categories: ["yogurts"], nutriScore: "b", novaGroup: 2,
    ingredientsText: "lait, ferments", additives: [], imageUrl: "x",
    nutriments: { energyKcal: 90, sugars: 5, saturatedFat: 1.5, salt: 0.1, fiber: 1, proteins: 6 }
  })));
  assert.equal(incomplete.gree.status, "unscored");
  assert.equal(complete.gree.status, "scored");
  const ranked = rankSearchResults("yaourt", [incomplete, complete], PREFS);
  assert.equal(ranked[0].p.name, "Yaourt B", "the well-documented product must rank first");
});

test("query relevance dominates a marginally higher score", () => {
  const relevant = scored(product({ name: "Céréales avoine", categories: ["cereals"], nutriScore: "b", novaGroup: 2, ingredientsText: "avoine", additives: [], imageUrl: "x", nutriments: { sugars: 5, fiber: 8, proteins: 10 } }));
  const irrelevant = scored(product({ name: "Eau minérale", categories: ["water"], nutriScore: "a", novaGroup: 1, ingredientsText: "eau", additives: [], imageUrl: "x", nutriments: { sugars: 0 } }));
  const ranked = rankSearchResults("céréales avoine", [irrelevant, relevant], PREFS);
  assert.equal(ranked[0].p.name, "Céréales avoine");
});

test("local criteria (bio preference) act as a tie-influencing boost", () => {
  const bio = scored(product({ name: "Yaourt bio", categories: ["yogurts"], isBio: true, nutriScore: "b", novaGroup: 2, ingredientsText: "lait", additives: [], imageUrl: "x", nutriments: { sugars: 6, proteins: 5 } }));
  const plain = scored(product({ name: "Yaourt nature", categories: ["yogurts"], nutriScore: "b", novaGroup: 2, ingredientsText: "lait", additives: [], imageUrl: "x", nutriments: { sugars: 6, proteins: 5 } }));
  const withBio = rankSearchResults("yaourt", [plain, bio], { ...PREFS, preferBio: true });
  assert.equal(withBio[0].p.isBio, true);
});

test("ranking is deterministic", () => {
  const items = [scored(product({ name: "A", categories: ["x"], nutriScore: "a" })), scored(product({ name: "B", categories: ["x"], nutriScore: "c" }))];
  assert.deepEqual(rankSearchResults("x", items, PREFS), rankSearchResults("x", items, PREFS));
});

test("localized names, synonyms and one-letter typos match returned candidates", () => {
  const p = product({ name: "Plain Yogurt", localizedNames: { fr: "Yaourt nature", ar: "زبادي طبيعي" } });
  assert.equal(relevanceScore("yoghurt", p), 1);
  assert.equal(relevanceScore("ياغورت", p), 1);
  assert.equal(relevanceScore("yaorut", p), 0.5);
  assert.equal(searchProviderTerm("yoghourt", "fr"), "yaourt");
});

test("an exact GTIN or brand stays first even if an unrelated product has a score", () => {
  const match = scored(product({ barcode: "036000291452", brand: "Atlas", name: "Produit incomplet" }));
  const other = scored(with2023Points(product({ name: "Chocolat", nutriScore: "a", ingredientsText: "cacao", additives: [], nutriments: { sugars: 2 } })));
  assert.equal(rankSearchResults("00036000291452", [other, match], PREFS)[0], match);
  assert.equal(rankSearchResults("atlas", [other, match], PREFS)[0], match);
});
