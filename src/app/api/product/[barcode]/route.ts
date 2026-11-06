import { NextResponse } from "next/server";
import { lookupBarcode } from "@/services/api/sources";
import { gtinIdentity } from "@greecheck/domain/product/gtin";
import { apiError, rateLimit, upstreamApiError } from "@/lib/api/guard";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ barcode: string }> }) {
  const limited = rateLimit(req, "product", { limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { barcode: code } = await params;
  if (!gtinIdentity(code)) {
    return apiError("invalid_barcode", 400);
  }

  try {
    const result = await lookupBarcode(code);
    if (result.status === "not_found") {
      return NextResponse.json({ ...result, dataState: "UNAVAILABLE" }, {
        status: 404,
        headers: { "Cache-Control": "public, max-age=60" }
      });
    }
    return NextResponse.json(result, {
      // No user data — only public product data, cacheable at the edge.
      headers: { "Cache-Control": "public, max-age=300, must-revalidate" }
    });
  } catch (err) {
    return upstreamApiError(err);
  }
}
