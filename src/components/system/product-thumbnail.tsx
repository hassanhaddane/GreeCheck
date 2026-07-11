import Image from "next/image";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const SIZES = { sm: 40, md: 48, lg: 64 } as const;

export interface ProductThumbnailProps {
  src?: string;
  alt?: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * ProductThumbnail — consistent product imagery: soft well, contained image,
 * quiet package glyph when no photo exists (unknown ≠ ugly).
 */
export function ProductThumbnail({ src, alt = "", size = "md", className }: ProductThumbnailProps) {
  const px = SIZES[size];
  return (
    <span
      className={cn("gc-well grid shrink-0 place-items-center overflow-hidden", className)}
      style={{ width: px, height: px }}
    >
      {src ? (
        <Image src={src} alt={alt} width={px} height={px} className="h-full w-full object-contain" unoptimized />
      ) : (
        <Package className="h-1/2 w-1/2 text-muted/60" strokeWidth={1.8} aria-hidden />
      )}
    </span>
  );
}
