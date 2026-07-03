import { NextResponse } from "next/server";
import { buildOverpassQuery, categoryOf, OFF_UA } from "@/lib/api/places-shared";
import type { Place } from "@/types/place";

export const runtime = "nodejs";

/**
 * Nearby food places (France only) via Overpass. ONE wide request per location:
 * all categories at once — the UI filters client-side, never re-calls this route
 * on a filter toggle. No user data stored.
 */
const OVERPASS_HOSTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_MAX = 100;

// Metropolitan France bounding box (loose).
const FR = { latMin: 41.0, latMax: 51.5, lonMin: -5.6, lonMax: 10.0 };

const cache = new Map<string, { at: number; places: Place[] }>();

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function distanceMeters(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");
  const radius = Math.min(5000, Math.max(500, Number(searchParams.get("radius") ?? "2500") || 2500));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "invalid_coordinates" }, { status: 400 });
  }
  // France-only for now: politely refuse out-of-bounds coordinates.
  if (lat < FR.latMin || lat > FR.latMax || lon < FR.lonMin || lon > FR.lonMax) {
    return NextResponse.json({ places: [], outsideFrance: true });
  }

  // Round coords so nearby requests share a cache entry (~110m grid).
  const key = `${lat.toFixed(3)}|${lon.toFixed(3)}|${radius}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json({ places: hit.places }, { headers: { "X-Cache": "HIT" } });
  }

  const body = buildOverpassQuery(lat, lon, radius);
  let lastError: Error | null = null;

  for (const host of OVERPASS_HOSTS) {
    try {
      const res = await fetch(host, {
        method: "POST",
        headers: { "Content-Type": "text/plain", "User-Agent": OFF_UA },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      if (!res.ok) throw new Error(`overpass_${res.status}`);
      const data = (await res.json()) as { elements?: OverpassElement[] };

      const seen = new Set<string>();
      const places: Place[] = (data.elements ?? [])
        .map((el): Place | null => {
          const tags = el.tags ?? {};
          const plat = el.lat ?? el.center?.lat;
          const plon = el.lon ?? el.center?.lon;
          if (plat === undefined || plon === undefined || !tags.name) return null;
          const id = `${el.type}/${el.id}`;
          if (seen.has(id)) return null;
          seen.add(id);
          const { category, inferred } = categoryOf(tags);
          if (category === "unknown") return null; // keep the map focused on food places
          const address = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]]
            .filter(Boolean)
            .join(" ");
          return {
            id,
            name: tags.name,
            category,
            inferred: inferred || undefined,
            lat: plat,
            lon: plon,
            address: address || undefined,
            brand: tags.brand,
            openingHours: tags.opening_hours,
            distanceMeters: distanceMeters(lat, lon, plat, plon),
            source: "osm"
          };
        })
        .filter((p): p is Place => p !== null)
        .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
        .slice(0, 100);

      if (cache.size >= CACHE_MAX) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
      }
      cache.set(key, { at: Date.now(), places });
      return NextResponse.json({ places }, { headers: { "Cache-Control": "public, max-age=900" } });
    } catch (err) {
      lastError = err as Error;
    }
  }

  console.error(`[api/france-places] all Overpass hosts failed (${key}): ${lastError?.message}`);
  return NextResponse.json({ error: "places_unavailable" }, { status: 502 });
}
