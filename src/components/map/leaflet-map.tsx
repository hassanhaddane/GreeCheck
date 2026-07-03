"use client";
import { useEffect, useRef } from "react";
import type { Place, GeoPoint } from "@/types/place";

// Leaflet's global CSS is imported once in src/app/globals.css (App-Router-safe).
// Leaflet itself is dynamically imported inside an effect so it NEVER runs during SSR.

const CAT_COLOR: Record<string, string> = {
  supermarket: "#2ECC71", bio: "#16A34A", halal: "#059669", grocery: "#39FF88", market: "#0B3D2E", unknown: "#66706A"
};

// France-only for now: keep the view inside metropolitan France (loose box).
const FRANCE_BOUNDS: [[number, number], [number, number]] = [[40.5, -6.5], [52.0, 10.5]];

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

export function LeafletMap({ center, places, userPoint, onSelect, onError }: {
  center: GeoPoint;
  places: Place[];
  userPoint?: GeoPoint | null;
  onSelect?: (id: string) => void;
  onError?: (error: unknown) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  // Init once. Leaflet is loaded lazily; failures surface via onError (never crash the page).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L = (await import("leaflet")).default;
        // Guard against React Strict Mode double-invoke / late resolution.
        if (cancelled || !elRef.current || mapRef.current) return;
        // If the container was previously initialized, release it first.
        if ((elRef.current as any)._leaflet_id) {
          try { (elRef.current as any)._leaflet_id = undefined; } catch { /* noop */ }
        }
        LRef.current = L;
        const map = L.map(elRef.current, {
          zoomControl: true,
          maxBounds: FRANCE_BOUNDS,
          maxBoundsViscosity: 1.0,
          minZoom: 5
        }).setView([center.lat, center.lon], 14);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        renderMarkers();
        setTimeout(() => { try { map.invalidateSize(); } catch { /* noop */ } }, 120);
      } catch (error) {
        if (!cancelled) onError?.(error);
      }
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /* noop */ }
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      try { mapRef.current.setView([center.lat, center.lon], Math.max(13, mapRef.current.getZoom())); } catch { /* noop */ }
    }
     
  }, [center.lat, center.lon]);

  useEffect(() => {
    renderMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, userPoint]);

  function renderMarkers() {
    const L = LRef.current;
    if (!L || !layerRef.current) return;
    layerRef.current.clearLayers();

    if (userPoint) {
      const uIcon = L.divIcon({
        className: "",
        html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid white;box-shadow:0 0 0 2px rgba(37,99,235,.4)"></span>`,
        iconSize: [16, 16], iconAnchor: [8, 8]
      });
      L.marker([userPoint.lat, userPoint.lon], { icon: uIcon }).addTo(layerRef.current);
    }

    places.forEach((p) => {
      const color = CAT_COLOR[p.category] ?? "#2ECC71";
      const icon = L.divIcon({
        className: "",
        html: `<span style="display:block;width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></span>`,
        iconSize: [24, 24], iconAnchor: [12, 24]
      });
      const m = L.marker([p.lat, p.lon], { icon }).addTo(layerRef.current);
      m.bindPopup(`<strong>${esc(p.name)}</strong>${p.address ? `<br>${esc(p.address)}` : ""}`);
      if (onSelect) m.on("click", () => onSelect(p.id));
    });
  }

  return <div ref={elRef} className="h-full w-full" aria-label="map" role="application" />;
}
