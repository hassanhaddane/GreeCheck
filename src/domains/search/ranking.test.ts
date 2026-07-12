/** Confidence-aware search ranking. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rankSearchResults, relevanceScore, type ScoredProduct } from "./ranking";
import { computeGreeScore } from "@/domains/scoring/gree-score";
import { defaultPreferences } from "@/domains/criteria/model";
import type { Product } from "@/domains/product/model";

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
  // Incomplete: only a great Nutri-Score, nothing else → high raw score, LOW confidence.
  const incomplete = scored(product({ name: "Yaourt A", categories: ["yogurts"], nutriScore: "a" }));
  // Complete: full data, slightly lower raw score, HIGH confidence.
  const complete = scored(product({
    name: "Yaourt B", categories: ["yogurts"], nutriScore: "b", novaGroup: 2,
    ingredientsText: "lait, ferments", additives: [], imageUrl: "x",
    nutriments: { sugars: 6, salt: 0.1, proteins: 5, saturatedFat: 2 }
  }));
  assert.ok(incomplete.gree.global >= complete.gree.global, "incomplete must have the higher RAW score to isolate the rule");
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
  const plain = scored(product({ name: "Yaourt", categories: ["yogurts"], nutriScore: "b", novaGroup: 2, ingredientsText: "lait", additives: [], imageUrl: "x", nutriments: { sugars: 6, proteins: 5 } }));
  const withBio = rankSearchResults("yaourt", [plain, bio], { ...PREFS, preferBio: true });
  assert.equal(withBio[0].p.isBio, true);
});

test("ranking is deterministic", () => {
  const items = [scored(product({ name: "A", categories: ["x"], nutriScore: "a" })), scored(product({ name: "B", categories: ["x"], nutriScore: "c" }))];
  assert.deepEqual(rankSearchResults("x", items, PREFS), rankSearchResults("x", items, PREFS));
});
