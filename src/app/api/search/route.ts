import { NextResponse } from "next/server";
import { searchProducts, type SearchResult } from "@/services/api/openfoodfacts";
import { normalizeError } from "@/services/api/errors";

export const runtime = "nodejs";

const MAX_QUERY_LENGTH = 120;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;

// Tiny in-memory cache (per server instance). No user data — only public queries.
const cache = new Map<string, { at: number; result: SearchResult }>();

function cacheGet(key: string): SearchResult | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return hit.result;
}

function cacheSet(key: string, result: SearchResult) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), result });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(20, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));

  if (q.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: "invalid_query", message: "Query too long" }, { status: 400 });
  }
  // Empty/short query: valid request, empty result — never hit the upstream.
  if (q.length < 2) {
    return NextResponse.json({ count: 0, page, pageSize, hasMore: false, products: [] });
  }

  const key = `${q.toLowerCase()}|${page}|${pageSize}`;
  const cached = cacheGet(key);
  if (cached) {
    return NextResponse.json(cached, { headers: { "Cache-Control": "public, max-age=600", "X-Cache": "HIT" } });
  }

  try {
    const result = await searchProducts(q, page, pageSize);
    cacheSet(key, result);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=600, stale-while-revalidate=86400" }
    });
  } catch (err) {
    const e = normalizeError(err);
    console.error(`[api/search] upstream failure for q="${q}" page=${page}: ${e.code} ${e.message}`);
    if (e.code === "rate_limited") {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: e.retryAfterMs ? { "Retry-After": String(Math.ceil(e.retryAfterMs / 1000)) } : undefined }
      );
    }
    return NextResponse.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
