import { NextResponse } from "next/server";
import { searchProducts } from "@/services/api/openfoodfacts";
import { apiError, rateLimit, clampInt, upstreamApiError } from "@/lib/api/guard";

export const runtime = "nodejs";

const MAX_QUERY_LENGTH = 120;
export async function GET(req: Request) {
  const limited = rateLimit(req, "search", { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const page = clampInt(searchParams.get("page"), 1, 1, 50);
  const pageSize = clampInt(searchParams.get("pageSize"), 20, 1, 20);

  if (q.length > MAX_QUERY_LENGTH) {
    return apiError("invalid_query", 400);
  }
  // Empty/short query: valid request, empty result — never hit the upstream.
  if (q.length < 2) {
    return NextResponse.json({ count: 0, page, pageSize, hasMore: false, products: [] });
  }

  const requestedLocale = searchParams.get("locale");
  const locale = requestedLocale === "ar" || requestedLocale === "en" ? requestedLocale : "fr";

  try {
    const result = await searchProducts(q, page, pageSize, locale);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (err) {
    return upstreamApiError(err);
  }
}
