import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * France-first geocoding via the Base Adresse Nationale (BAN).
 * Primary host is the Géoplateforme (the maintained home of the BAN API);
 * the legacy api-adresse host is kept as fallback. France only, no data stored.
 */
const BAN_HOSTS = ["https://data.geopf.fr/geocodage/search", "https://api-adresse.data.gouv.fr/search/"];
const TIMEOUT_MS = 6000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 300;

export interface FranceGeoResult {
  label: string;
  city?: string;
  postcode?: string;
  lat: number;
  lon: number;
  score: number;
}

interface BanFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: { label?: string; city?: string; municipality?: string; postcode?: string; score?: number };
}

const cache = new Map<string, { at: number; results: FranceGeoResult[] }>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 200) return NextResponse.json({ results: [] });

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json({ results: hit.results }, { headers: { "X-Cache": "HIT" } });
  }

  let lastError: Error | null = null;
  for (const host of BAN_HOSTS) {
    try {
      const res = await fetch(`${host}?q=${encodeURIComponent(q)}&limit=6&autocomplete=1`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      if (!res.ok) throw new Error(`ban_${res.status}`);
      const data = (await res.json()) as { features?: BanFeature[] };

      const results: FranceGeoResult[] = (data.features ?? [])
        .map((f): FranceGeoResult | null => {
          const [lon, lat] = f.geometry?.coordinates ?? [];
          const p = f.properties ?? {};
          if (lat === undefined || lon === undefined || !p.label) return null;
          return {
            label: p.label,
            city: p.city ?? p.municipality,
            postcode: p.postcode,
            lat,
            lon,
            score: p.score ?? 0
          };
        })
        .filter((r): r is FranceGeoResult => r !== null);

      if (cache.size >= CACHE_MAX) {
        const oldest = cache.keys().next().value;
        if (oldest) cache.delete(oldest);
      }
      cache.set(key, { at: Date.now(), results });
      return NextResponse.json({ results }, { headers: { "Cache-Control": "public, max-age=86400" } });
    } catch (err) {
      lastError = err as Error;
    }
  }

  console.error(`[api/france-geocode] all BAN hosts failed for q="${q}": ${lastError?.message}`);
  return NextResponse.json({ error: "geocode_unavailable" }, { status: 502 });
}
