import { NextResponse } from "next/server";
import { OVERPASS_SELECTORS, categoryOf, OFF_UA } from "@/lib/api/places-shared";
import type { Place, PlaceCategory } from "@/types/place";

export const runtime = "nodejs";

const ALL: PlaceCategory[] = ["supermarket", "bio", "halal", "grocery", "market"];

// Proxy to OpenStreetMap Overpass for nearby food places. No data stored.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");
  const radius = Math.min(20000, Math.max(500, Number(searchParams.get("radius") ?? "3000") || 3000));
  const cats = (searchParams.get("types") ?? "").split(",").filter(Boolean) as PlaceCategory[];
  const selected = cats.length ? cats.filter((c) => ALL.includes(c)) : ALL;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ places: [] }, { status: 400 });
  }

  const body = `[out:json][timeout:25];(${selected
    .flatMap((c) => OVERPASS_SELECTORS[c])
    .map((sel) => `${sel}(around:${radius},${lat},${lon});`)
    .join("")});out center 80;`;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "text/plain", "User-Agent": OFF_UA },
      body,
      next: { revalidate: 1800 }
    });
    if (!res.ok) throw new Error(`overpass_${res.status}`);
    const data = (await res.json()) as { elements?: any[] };

    const places: Place[] = (data.elements ?? [])
      .map((el) => {
        const tags: Record<string, string> = el.tags ?? {};
        const plat = el.lat ?? el.center?.lat;
        const plon = el.lon ?? el.center?.lon;
        if (plat === undefined || plon === undefined || !tags.name) return null;
        const address = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean).join(" ");
        return {
          id: `${el.type}/${el.id}`,
          name: tags.name,
          category: categoryOf(tags),
          lat: plat,
          lon: plon,
          address: address || undefined,
          brand: tags.brand,
          openingHours: tags.opening_hours
        } as Place;
      })
      .filter((p): p is Place => p !== null)
      .slice(0, 60);

    return NextResponse.json({ places }, { headers: { "Cache-Control": "public, max-age=1800" } });
  } catch (err) {
    return NextResponse.json({ error: "places_unavailable", message: (err as Error).message }, { status: 502 });
  }
}
