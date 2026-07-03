"use client";
import type { Place, GeoResult } from "@/types/place";

// Client-side cache for geocode queries already made this session.
const geoCache = new Map<string, GeoResult[]>();

/** France-only geocoding (city / postcode / address) via /api/france-geocode. */
export async function geocodeFrance(query: string): Promise<GeoResult[]> {
  const key = query.trim().toLowerCase();
  const cached = geoCache.get(key);
  if (cached) return cached;

  const res = await fetch(`/api/france-geocode?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: { label: string; city?: string; postcode?: string; lat: number; lon: number }[];
  };
  const results: GeoResult[] = (data.results ?? []).map((r) => ({
    name: r.label,
    city: r.city,
    postcode: r.postcode,
    lat: r.lat,
    lon: r.lon
  }));
  geoCache.set(key, results);
  return results;
}

/**
 * Load ALL nearby food places in one call (every category). Filtering happens
 * client-side. Throws on failure so the UI can show a clear error state.
 */
export async function fetchNearbyPlaces(lat: number, lon: number, radius = 2500, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon), radius: String(radius) });
  const res = await fetch(`/api/france-places?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`places_failed_${res.status}`);
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
