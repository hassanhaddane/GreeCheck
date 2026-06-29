import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/api/openfoodfacts";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20));

  if (q.length < 2) {
    return NextResponse.json({ count: 0, page, pageSize, products: [] });
  }

  try {
    const result = await searchProducts(q, page, pageSize);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400" }
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: "upstream_unavailable", message: (err as Error).message },
      { status: 502 }
    );
  }
}
