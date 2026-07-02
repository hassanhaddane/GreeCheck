import { NextResponse } from "next/server";
import { OFF_UA } from "@/lib/api/places-shared";

export const runtime = "nodejs";

// Proxy to OpenStreetMap Nominatim for city/place search. No data stored.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const lang = searchParams.get("lang") ?? "en";
  if (q.length < 2) return NextResponse.json({ results: [] });

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": OFF_UA, "Accept-Language": lang },
      next: { revalidate: 86400 }
    });
    if (!res.ok) throw new Error(`nominatim_${res.status}`);
    const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
    const results = data.map((d) => ({ name: d.display_name, lat: parseFloat(d.lat), lon: parseFloat(d.lon) }));
    return NextResponse.json({ results }, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch (err) {
    return NextResponse.json({ error: "geocode_unavailable", message: (err as Error).message }, { status: 502 });
  }
}
