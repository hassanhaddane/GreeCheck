import { NextResponse } from "next/server";
import { PLACE_TYPES, type Place, type PlaceType } from "@/domains/discover/model";

export const runtime = "nodejs";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const OVERPASS_ENDPOINTS = [
  process.env.OVERPASS_API_URL,
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter"
].filter((value): value is string => Boolean(value));
const USER_AGENT = process.env.OSM_USER_AGENT || "GreeCheck/0.1 (contact@greecheck.app)";
const MAX_RESULTS = 40;

type OsmTags = Record<string, string | undefined>;
type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: OsmTags;
};

function finiteCoordinate(value: string | null, min: number, max: number): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
}

function classify(tags: OsmTags): PlaceType | undefined {
  if (/^(yes|only)$/i.test(tags["diet:halal"] ?? tags.halal ?? "")) return "halal";
  if (tags.shop === "organic" || /^(yes|only)$/i.test(tags.organic ?? "")) return "organic";
  if (tags.amenity === "marketplace") return "market";
  if (tags.shop === "supermarket") return "supermarket";
  if (tags.shop === "grocery" || tags.shop === "convenience") return "grocery";
  return undefined;
}

function address(tags: OsmTags): string | undefined {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const locality = [tags["addr:postcode"], tags["addr:city"] ?? tags["addr:town"] ?? tags["addr:village"]]
    .filter(Boolean)
    .join(" ");
  return [street, locality].filter(Boolean).join(", ") || undefined;
}

function safeWebsite(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.startsWith("www.") ? `https://${value}` : value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

async function geocode(city: string): Promise<{ lat: number; lon: number; label: string } | undefined> {
  const params = new URLSearchParams({ q: city, format: "jsonv2", limit: "1", addressdetails: "1" });
  const response = await fetch(`${NOMINATIM}/search?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", "Accept-Language": "fr,en,ar" },
    next: { revalidate: 60 * 60 * 24 },
    signal: AbortSignal.timeout(7000)
  });
  if (!response.ok) throw new Error(`nominatim_${response.status}`);
  const rows = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  const first = rows[0];
  if (!first) return undefined;
  const lat = Number(first.lat);
  const lon = Number(first.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon, label: first.display_name } : undefined;
}

function overpassQuery(lat: number, lon: number, radius: number): string {
  return `[out:json][timeout:20];(\n` +
    `nwr(around:${radius},${lat},${lon})["shop"~"^(supermarket|organic|convenience|grocery)$"];\n` +
    `nwr(around:${radius},${lat},${lon})["amenity"="marketplace"];\n` +
    `nwr(around:${radius},${lat},${lon})["organic"~"^(yes|only)$"];\n` +
    `nwr(around:${radius},${lat},${lon})["diet:halal"~"^(yes|only)$"];\n` +
    `nwr(around:${radius},${lat},${lon})["halal"~"^(yes|only)$"];\n` +
    `);out center tags;`;
}

async function fetchOverpass(lat: number, lon: number): Promise<{ elements?: OverpassElement[] }> {
  let lastError: unknown;
  const deadline = Date.now() + 12_000;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const remaining = deadline - Date.now();
    if (remaining < 500) break;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams({ data: overpassQuery(lat, lon, 3000) }),
        cache: "no-store",
        signal: AbortSignal.timeout(Math.min(6_500, remaining))
      });
      if (!response.ok) throw new Error(`overpass_${response.status}`);
      return (await response.json()) as { elements?: OverpassElement[] };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("overpass_unavailable");
}

async function findPlaces(lat: number, lon: number, selected: Set<PlaceType>): Promise<Place[]> {
  const payload = await fetchOverpass(lat, lon);
  const places: Place[] = [];

  for (const element of payload.elements ?? []) {
    const tags = element.tags ?? {};
    const type = classify(tags);
    const placeLat = element.lat ?? element.center?.lat;
    const placeLon = element.lon ?? element.center?.lon;
    if (!type || !selected.has(type) || placeLat === undefined || placeLon === undefined) continue;
    places.push({
      id: `${element.type}-${element.id}`,
      name: tags.name ?? tags.brand ?? tags.operator ?? "",
      type,
      lat: placeLat,
      lon: placeLon,
      address: address(tags),
      openingHours: tags.opening_hours,
      website: safeWebsite(tags.website ?? tags["contact:website"])
    });
    if (places.length >= MAX_RESULTS) break;
  }

  return places;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = (url.searchParams.get("city") ?? "").trim().slice(0, 120);
  const lat = finiteCoordinate(url.searchParams.get("lat"), -90, 90);
  const lon = finiteCoordinate(url.searchParams.get("lon"), -180, 180);
  const requested = (url.searchParams.get("types") ?? "")
    .split(",")
    .filter((value): value is PlaceType => PLACE_TYPES.includes(value as PlaceType));
  const selected = new Set<PlaceType>(requested.length ? requested : PLACE_TYPES);

  try {
    const center = lat !== undefined && lon !== undefined
      ? { lat, lon, label: "" }
      : city.length >= 2
        ? await geocode(city)
        : undefined;

    if (!center) {
      return NextResponse.json({ error: city ? "city_not_found" : "invalid_location" }, { status: 400 });
    }

    const places = await findPlaces(center.lat, center.lon, selected);
    return NextResponse.json(
      { center, places, attribution: "© OpenStreetMap contributors" },
      { headers: { "Cache-Control": city ? "public, max-age=300, stale-while-revalidate=3600" : "private, no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "places_unavailable" }, { status: 502 });
  }
}
