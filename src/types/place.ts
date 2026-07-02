export type PlaceCategory = "supermarket" | "bio" | "halal" | "grocery" | "market";

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
}

export interface GeoResult extends GeoPoint {
  name: string;
}
