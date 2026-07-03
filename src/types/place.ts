export type PlaceCategory = "supermarket" | "bio" | "halal" | "grocery" | "market" | "unknown";

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface Place extends GeoPoint {
  id: string;
  name: string;
  category: PlaceCategory;
  address?: string;
  brand?: string;
  openingHours?: string;
  distanceMeters?: number;
  /** True when the category (e.g. halal) is inferred from the name, not from explicit OSM tags. */
  inferred?: boolean;
  source: "osm";
}

export interface GeoResult extends GeoPoint {
  name: string;
  city?: string;
  postcode?: string;
}
