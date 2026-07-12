export const PLACE_TYPES = ["supermarket", "organic", "halal", "grocery", "market"] as const;

export type PlaceType = (typeof PLACE_TYPES)[number];

export interface Place {
  id: string;
  name: string;
  type: PlaceType;
  lat: number;
  lon: number;
  address?: string;
  openingHours?: string;
  website?: string;
}

export interface PlaceSearchResult {
  center: { lat: number; lon: number; label: string };
  places: Place[];
  attribution: string;
}
