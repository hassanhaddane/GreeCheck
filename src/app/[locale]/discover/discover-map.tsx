import type { PlaceSearchResult } from "@/domains/discover/model";

export function DiscoverMap({ result, title }: { result: PlaceSearchResult; title: string }) {
  const { lat, lon } = result.center;
  const deltaLat = 0.045;
  const deltaLon = 0.07;
  const bbox = [lon - deltaLon, lat - deltaLat, lon + deltaLon, lat + deltaLat].join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lon}`;

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-soft">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="h-72 w-full border-0 sm:h-96"
      />
    </div>
  );
}
