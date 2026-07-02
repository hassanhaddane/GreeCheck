"use client";
import type { Place, GeoResult, PlaceCategory } from "@/types/place";

export async function geocodeCity(query: string, lang = "en"): Promise<GeoResult[]> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}&lang=${lang}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: GeoResult[] };
  return data.results ?? [];
}

export async function fetchNearbyPlaces(lat: number, lon: number, categories: PlaceCategory[], radius = 3000): Promise<Place[]> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon), radius: String(radius) });
  if (categories.length) params.set("types", categories.join(","));
  const res = await fetch(`/api/places?${params.toString()}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { places?: Place[] };
  return data.places ?? [];
}

/** Haversine distance in km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
