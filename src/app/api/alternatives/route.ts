import { NextResponse } from "next/server";
import { searchByCategory } from "@/services/api/openfoodfacts";
import { normalizeError } from "@/services/api/errors";
import { apiError, rateLimit } from "@/lib/api/guard";

export const runtime = "nodejs";

const MAX_CATEGORY_LENGTH = 120;

export async function GET(req: Request) {
  const limited = rateLimit(req, "alternatives", { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const category = (searchParams.get("category") ?? "").trim();
  const exclude = (searchParams.get("exclude") ?? "").replace(/\D/g, "");

  if (category.length > MAX_CATEGORY_LENGTH) return apiError("invalid_request", 400);
  if (!category) return NextResponse.json({ products: [] });

  try {
    const res = await searchByCategory(category, 16);
    const products = res.products.filter((p) => p.barcode !== exclude);
    return NextResponse.json(
      { products },
      { headers: { "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400" } }
    );
  } catch (err) {
    // Never leak the upstream exception message to the client.
    const e = normalizeError(err);
    if (e.code === "rate_limited") return apiError("rate_limited", 429);
    return apiError(e.code === "network" ? "upstream_unreachable" : "upstream_unavailable", 502);
  }
}
