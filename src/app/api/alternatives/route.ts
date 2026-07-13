import { NextResponse } from "next/server";
import { searchByCategory } from "@/lib/api/openfoodfacts";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = (searchParams.get("category") ?? "").trim();
  const exclude = (searchParams.get("exclude") ?? "").replace(/\D/g, "");

  if (!category) return NextResponse.json({ products: [] });

  try {
    const res = await searchByCategory(category, 16);
    const products = res.products.filter((p) => p.barcode !== exclude);
    return NextResponse.json(
      { products },
      { headers: { "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400" } }
    );
  } catch (err) {
    return NextResponse.json(
      { status: "error", error: "upstream_unavailable", message: (err as Error).message },
      { status: 502 }
    );
  }
}
