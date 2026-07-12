import { NextResponse } from "next/server";
import { fetchProductByBarcode } from "@/services/api/openfoodfacts";
import { normalizeError } from "@/services/api/errors";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ barcode: string }> }) {
  const { barcode } = await params;
  const code = (barcode ?? "").replace(/\D/g, "");

  if (code.length < 6) {
    return NextResponse.json({ status: "error", error: "invalid_barcode" }, { status: 400 });
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
      return NextResponse.json(
        { status: "rate_limited" },
        { status: 429, headers: e.retryAfterMs ? { "Retry-After": String(Math.ceil(e.retryAfterMs / 1000)) } : undefined }
      );
    }
    return NextResponse.json(
      { status: "error", error: e.code === "network" ? "upstream_unreachable" : "upstream_unavailable" },
      { status: 502 }
    );
  }
}
