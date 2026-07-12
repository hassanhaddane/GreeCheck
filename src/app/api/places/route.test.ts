import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { GET } from "./route";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

test("places route geocodes a city and normalizes useful OSM categories", async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("nominatim")) {
      return jsonResponse([{ lat: "48.8566", lon: "2.3522", display_name: "Paris, France" }]);
    }
    return jsonResponse({ elements: [
      { type: "node", id: 1, lat: 48.85, lon: 2.35, tags: { name: "Marché test", amenity: "marketplace" } },
      { type: "node", id: 2, lat: 48.86, lon: 2.36, tags: { name: "Bio test", shop: "supermarket", organic: "only", website: "javascript:alert(1)" } },
      { type: "way", id: 3, center: { lat: 48.87, lon: 2.37 }, tags: { name: "Halal test", shop: "grocery", "diet:halal": "yes", "addr:street": "Rue Test" } }
    ] });
  }) as typeof fetch;

  const response = await GET(new Request("http://localhost/api/places?city=Paris&types=market,organic,halal"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=300, stale-while-revalidate=3600");
  const body = await response.json();
  assert.equal(body.center.label, "Paris, France");
  assert.deepEqual(body.places.map((place: { type: string }) => place.type), ["market", "organic", "halal"]);
  assert.equal(body.places[1].website, undefined, "unsafe OSM URLs must be removed");
  assert.equal(body.places[2].address, "Rue Test");
  assert.equal(calls.length, 2);
});

test("Around me never becomes a shared cache entry", async () => {
  globalThis.fetch = (async () => jsonResponse({ elements: [] })) as typeof fetch;
  const response = await GET(new Request("http://localhost/api/places?lat=48.85&lon=2.35&types=supermarket"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});
