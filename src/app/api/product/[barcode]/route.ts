import { NextResponse } from "next/server";
import { fetchProductByBarcode } from "@/services/api/openfoodfacts";
import { normalizeError } from "@/services/api/errors";
import { apiError, rateLimit } from "@/lib/api/guard";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ barcode: string }> }) {
  const limited = rateLimit(req, "product", { limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { barcode } = await params;
  const code = (barcode ?? "").replace(/\D/g, "");

  if (code.length < 6) {
    return apiError("invalid_barcode", 400);
  }

  try {
    const result = await fetchProductByBarcode(code);
    if (result.status === "not_found") {
      return NextResponse.json(result, {
        status: 404,
        headers: { "Cache-Control": "public, max-age=60" }
      });
    }
    return NextResponse.json(result, {
      // No user data — only public product data, cacheable at the edge.
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" }
    });
  } catch (err) {
    const e = normalizeError(err);
    if (e.code === "rate_limited") {
      return apiError("rate_limited", 429, e.retryAfterMs ? { "Retry-After": String(Math.ceil(e.retryAfterMs / 1000)) } : undefined);
    }
    // Never surface the raw exception message.
    return apiError(e.code === "network" ? "upstream_unreachable" : "upstream_unavailable", 502);
  }
}
