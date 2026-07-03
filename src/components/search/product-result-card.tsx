"use client";
import { ProductCard, type ProductCardProps } from "@/components/product/product-card";

/** Search result row — the shared premium ProductCard with quick actions. */
export function ProductResultCard(props: ProductCardProps) {
  return <ProductCard {...props} />;
}
