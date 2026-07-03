"use client";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/types/product";
import type { GreeScore } from "@/types/scoring";

/** Search result row — the shared premium ProductCard with quick actions. */
export function ProductResultCard({ product, gree }: { product: Product; gree: GreeScore }) {
  return <ProductCard product={product} gree={gree} />;
}
