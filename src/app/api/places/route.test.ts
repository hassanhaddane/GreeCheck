import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { GET } from "./route";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

test("places route geocodes a city and normalizes useful OSM categories", async (t) => {
  process.env.NOMINATIM_API_URL = "https://nominatim.example.test/search";
  t.after(() => { delete process.env.NOMINATIM_API_URL; });
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
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
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

test("ambiguous location and the unconfigured city provider fail before any external call", async () => {
  globalThis.fetch = (async () => { assert.fail("must not reach an external provider"); }) as typeof fetch;
  const mixed = await GET(new Request("http://localhost/api/places?city=Paris&lat=48.85111&lon=2.35555"));
  assert.equal(mixed.status, 400);
  const unconfigured = await GET(new Request("http://localhost/api/places?city=Lyon"));
  assert.equal(unconfigured.status, 503);
  assert.deepEqual(await unconfigured.json(), { error: "city_search_unavailable" });
});

test("Around me rounds coordinates before forwarding them and ignores malformed places", async () => {
  globalThis.fetch = (async (_input, init) => {
    assert.match(String(init?.body), /48\.85%2C2\.36/);
    return jsonResponse({ elements: [{ type: "node", id: 1, lat: "invalid", lon: 2, tags: { shop: "organic" } }] });
  }) as typeof fetch;
  const response = await GET(new Request("http://localhost/api/places?lat=48.8511&lon=2.3562"));
  assert.deepEqual((await response.json()).places, []);
});
