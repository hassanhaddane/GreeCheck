import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/api/guard";
import { cachedRequests, record } from "@/services/api/upstream";
import { configuredGeocoder } from "@/services/api/places-config";
import { PLACE_TYPES, type Place, type PlaceType } from "@/domains/discover/model";

export const runtime = "nodejs";

const OVERPASS_ENDPOINTS = [
  process.env.OVERPASS_API_URL,
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter"
].filter((value): value is string => Boolean(value));
const USER_AGENT = process.env.OSM_USER_AGENT || "GreeCheck/3.0 (+https://github.com/hassanhaddane/GreeCheck)";
const MAX_RESULTS = 40;

type OsmTags = Record<string, string | undefined>;
type Center = { lat: number; lon: number; label: string };
const cityCache = cachedRequests<Center | undefined>(100, (value) => value ? 60 * 60_000 : 0);

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
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function geocode(city: string, endpoint: URL): Promise<Center | undefined> {
  const key = JSON.stringify([endpoint.origin, endpoint.pathname, city.toLowerCase()]);
  return cityCache(key, async () => {
    endpoint.searchParams.set("q", city);
    endpoint.searchParams.set("format", "jsonv2");
    endpoint.searchParams.set("limit", "1");
    const response = await fetch(endpoint, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", "Accept-Language": "fr,en,ar" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error("geocoder_unavailable");
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error("geocoder_invalid_payload");
    const first = record(payload[0]);
    const lat = finiteCoordinate(typeof first?.lat === "string" ? first.lat : null, -90, 90);
    const lon = finiteCoordinate(typeof first?.lon === "string" ? first.lon : null, -180, 180);
    return lat !== undefined && lon !== undefined
      ? { lat, lon, label: typeof first?.display_name === "string" ? first.display_name : city }
      : undefined;
  });
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

async function fetchOverpass(lat: number, lon: number): Promise<unknown[]> {
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
        redirect: "error",
        signal: AbortSignal.timeout(Math.min(6_500, remaining))
      });
      if (!response.ok) throw new Error(`overpass_${response.status}`);
      const payload = record(await response.json());
      if (!Array.isArray(payload?.elements)) throw new Error("overpass_invalid_payload");
      return payload.elements;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("overpass_unavailable");
}

async function findPlaces(lat: number, lon: number, selected: Set<PlaceType>): Promise<Place[]> {
  const payload = await fetchOverpass(lat, lon);
  const places: Place[] = [];

  for (const row of payload) {
    const element = record(row);
    if (!element || !["node", "way", "relation"].includes(String(element.type)) || typeof element.id !== "number") continue;
    const tags = Object.fromEntries(Object.entries(record(element.tags) ?? {}).filter((pair): pair is [string, string] => typeof pair[1] === "string"));
    const center = record(element.center);
    const type = classify(tags);
    const placeLat = element.lat ?? center?.lat;
    const placeLon = element.lon ?? center?.lon;
    if (!type || !selected.has(type) || typeof placeLat !== "number" || typeof placeLon !== "number" ||
        !Number.isFinite(placeLat) || !Number.isFinite(placeLon) || Math.abs(placeLat) > 90 || Math.abs(placeLon) > 180) continue;
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
  const limited = rateLimit(request, "places", { limit: 8, windowMs: 60_000 });
  if (limited) return limited;
  const url = new URL(request.url);
  const city = (url.searchParams.get("city") ?? "").trim();
  const lat = finiteCoordinate(url.searchParams.get("lat"), -90, 90);
  const lon = finiteCoordinate(url.searchParams.get("lon"), -180, 180);
  const coordinateQuery = url.searchParams.has("lat") || url.searchParams.has("lon");
  if ((coordinateQuery && (city || lat === undefined || lon === undefined)) ||
      (!coordinateQuery && !/^[\p{L}\p{M} .,'’()-]{2,120}$/u.test(city))) {
    return NextResponse.json({ error: "invalid_location" }, { status: 400 });
  }
  const geocoder = coordinateQuery ? undefined : configuredGeocoder();
  if (!coordinateQuery && !geocoder) return NextResponse.json({ error: "city_search_unavailable" }, { status: 503 });
  const requested = (url.searchParams.get("types") ?? "")
    .split(",")
    .filter((value): value is PlaceType => PLACE_TYPES.includes(value as PlaceType));
  const selected = new Set<PlaceType>(requested.length ? requested : PLACE_TYPES);

  try {
    const center = lat !== undefined && lon !== undefined
      ? { lat: Number(lat.toFixed(2)), lon: Number(lon.toFixed(2)), label: "" }
      : geocoder && await geocode(city, geocoder);

    if (!center) {
      return NextResponse.json({ error: city ? "city_not_found" : "invalid_location" }, { status: 400 });
    }

    const places = await findPlaces(center.lat, center.lon, selected);
    return NextResponse.json(
      { center, places, attribution: "© OpenStreetMap contributors" },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "places_unavailable" }, { status: 502 });
  }
}
