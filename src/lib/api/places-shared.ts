import type { PlaceCategory } from "@/types/place";

export const OFF_UA = "GreeCheck/0.1 (contact@greecheck.app)";

/**
 * ONE wide Overpass query fetching every category GreeCheck cares about in a
 * single round-trip. Filters are then applied CLIENT-SIDE — toggling a chip
 * never triggers a new Overpass call.
 */
export function buildOverpassQuery(lat: number, lon: number, radius: number): string {
  const around = `(around:${radius},${lat},${lon})`;
  return `[out:json][timeout:6];(
nwr["shop"~"^(supermarket|convenience|grocery|greengrocer|organic|health_food|butcher)$"]${around};
nwr["amenity"="marketplace"]${around};
nwr["diet:halal"~"^(only|yes)$"]["shop"]${around};
);out center 120;`;
}

const HALAL_NAME_RE = /halal|hallal|boucherie\s+(orientale|musulmane)|oriental(e)?\s+market/i;

/** Classify an OSM element. `inferred` = halal guessed from name/operator, not tags. */
export function categoryOf(tags: Record<string, string>): { category: PlaceCategory; inferred: boolean } {
  if (tags["diet:halal"] === "yes" || tags["diet:halal"] === "only") return { category: "halal", inferred: false };
  const nameish = `${tags.name ?? ""} ${tags.operator ?? ""} ${tags.brand ?? ""}`;
  if (HALAL_NAME_RE.test(nameish)) return { category: "halal", inferred: true };
  if (tags["shop"] === "organic" || tags["shop"] === "health_food" || tags["organic"] === "yes" || tags["organic"] === "only")
    return { category: "bio", inferred: false };
  if (tags["amenity"] === "marketplace") return { category: "market", inferred: false };
  if (["convenience", "grocery", "greengrocer"].includes(tags["shop"] ?? "")) return { category: "grocery", inferred: false };
  if (tags["shop"] === "supermarket") return { category: "supermarket", inferred: false };
  return { category: "unknown", inferred: false };
}
