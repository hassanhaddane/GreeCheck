import { NextResponse } from "next/server";
import { searchByCategory } from "@/services/api/openfoodfacts";
import { apiError, rateLimit, upstreamApiError } from "@/lib/api/guard";

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
    return upstreamApiError(err);
  }
}
