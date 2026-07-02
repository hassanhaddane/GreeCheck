import type { PlaceCategory } from "@/types/place";

// Overpass QL selectors for each category (applied within a radius).
export const OVERPASS_SELECTORS: Record<PlaceCategory, string[]> = {
  supermarket: ['nwr["shop"="supermarket"]'],
  bio: ['nwr["shop"="organic"]', 'nwr["organic"~"only|yes"]["shop"="supermarket"]'],
  halal: ['nwr["diet:halal"~"only|yes"]'],
  grocery: ['nwr["shop"~"convenience|grocery|greengrocer"]'],
  market: ['nwr["amenity"="marketplace"]']
};

export const OFF_UA = "GreeCheck/0.1 (https://greecheck.app)";

export function categoryOf(tags: Record<string, string>): PlaceCategory {
  if (tags["diet:halal"] === "yes" || tags["diet:halal"] === "only") return "halal";
  if (tags["shop"] === "organic" || tags["organic"] === "yes" || tags["organic"] === "only") return "bio";
  if (tags["amenity"] === "marketplace") return "market";
  if (["convenience", "grocery", "greengrocer"].includes(tags["shop"])) return "grocery";
  return "supermarket";
}
