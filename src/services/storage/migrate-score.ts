import { defaultPreferences } from "@greecheck/domain/criteria/model";
import { computeGreeScore } from "@greecheck/domain/scoring/gree-score";
import { METHODOLOGY_VERSION } from "@greecheck/domain/scoring/methodology";
import { db } from "./db";

/** Refresh derived fields atomically before hydration. Preserve the original snapshot for audit. */
export async function migrateScoreSnapshots(): Promise<void> {
  const database = db;
  if (!database) return;
  await database.transaction("rw", database.products, database.history, database.favorites, database.cart, async () => {
    const [history, favorites, cart] = await Promise.all([
      database.history.toArray(), database.favorites.toArray(), database.cart.toArray()
    ]);
    const library = [...history, ...favorites].filter(row => row.scoreVersion !== METHODOLOGY_VERSION);
    const barcodes = [...new Set(library.map(row => row.barcode))];
    const cached = await database.products.bulkGet(barcodes);
    const products = new Map(cached.flatMap(row => row?.result && "product" in row.result
      ? [[row.barcode, row.result.product] as const] : []));
    const results = new Map([...products].map(([barcode, product]) => [barcode, computeGreeScore(product, defaultPreferences)]));
    const updateLibrary = (rows: typeof history) => rows.filter(row => row.scoreVersion !== METHODOLOGY_VERSION).map(row => {
      const result = results.get(row.barcode);
      const product = products.get(row.barcode);
      return {
        ...row,
        previousScore: row.previousScore ?? (row.score !== undefined ? { score: row.score, grade: row.grade, version: row.scoreVersion ?? "legacy" } : undefined),
        score: result?.score,
        grade: result?.grade,
        scoreVersion: METHODOLOGY_VERSION,
        scoreObsolete: !result,
        verdict: "",
        ...(row.warningCode === "additiveAvoid" && { warningCode: undefined, warningValues: undefined, critical: undefined }),
        sugars: product?.nutritionBasis === "100g" ? product.nutriments.sugars : undefined,
        declaredAdditives: product?.additives?.length
      };
    });
    await Promise.all([
      database.history.bulkPut(updateLibrary(history)),
      database.favorites.bulkPut(updateLibrary(favorites)),
      database.cart.bulkPut(cart.filter(row => row.scoreVersion !== METHODOLOGY_VERSION).map(row => ({
        ...row,
        previousScore: row.previousScore ?? (row.score !== undefined ? { score: row.score, version: row.scoreVersion ?? "legacy" } : undefined),
        score: computeGreeScore(row.product, defaultPreferences).score,
        scoreVersion: METHODOLOGY_VERSION
      })))
    ]);
  });
}
