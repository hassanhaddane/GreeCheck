/**
 * GreeSwap application service — the retrieval side of the swap feature.
 *
 * Boundary contract: the domain package (@greecheck/domain) decides
 * eligibility and ranks candidates but never touches the network. This
 * service performs the single fetch against the app's stateless proxy and
 * delegates every decision back to the pure engine.
 */
import type { Product } from "@greecheck/domain/product/model";
import type { LocalPreferences } from "@greecheck/domain/criteria/model";
import { computeGreeScore } from "@greecheck/domain/scoring/gree-score";
import {
  isSwapEligible,
  rankAlternatives,
  preciseCategory,
  type ProductAlternative
} from "@greecheck/domain/swap/engine";

/**
 * Suggest validated healthier alternatives. Returns [] when the product is not
 * swap-eligible or when no TRUSTWORTHY alternative exists (the UI then renders
 * nothing — never an empty section).
 */
export async function getAlternatives(
  product: Product,
  prefs: LocalPreferences
): Promise<ProductAlternative[]> {
  const curGree = computeGreeScore(product, prefs);
  if (!isSwapEligible(product, curGree, prefs).eligible) return [];

  const cat = preciseCategory(product);
  if (!cat) return [];

  const res = await fetch(
    `/api/alternatives?category=${encodeURIComponent(cat)}&exclude=${product.barcode}`
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { products?: Product[] };

  const candidates = (data.products ?? [])
    .filter((p) => p.barcode && p.name)
    .map((p) => ({ product: p, gree: computeGreeScore(p, prefs) }));

  return rankAlternatives(product, curGree, candidates, prefs);
}
