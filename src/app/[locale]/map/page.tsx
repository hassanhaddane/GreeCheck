"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { Search, LocateFixed, X, MapPin, MapPinOff, RotateCw, Navigation, Store, Leaf, BadgeCheck, ShoppingCart, Tent, ShieldCheck } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { geocodeCity, fetchNearbyPlaces, distanceKm } from "@/lib/api/places";
import type { Place, PlaceCategory, GeoPoint, GeoResult } from "@/types/place";

const LeafletMap = dynamic(() => import("@/components/map/leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <div className="grid h-full w-full place-items-center bg-surface-2 text-sm text-muted">…</div>
});

const CATS: { id: PlaceCategory; icon: typeof Store }[] = [
  { id: "supermarket", icon: Store },
  { id: "bio", icon: Leaf },
  { id: "halal", icon: BadgeCheck },
  { id: "grocery", icon: ShoppingCart },
  { id: "market", icon: Tent }
];
const CAT_ICON: Record<PlaceCategory, typeof Store> = { supermarket: Store, bio: Leaf, halal: BadgeCheck, grocery: ShoppingCart, market: Tent };

const DEFAULT_CENTER: GeoPoint = { lat: 48.8566, lon: 2.3522 }; // Paris — just an initial view

export default function MapPage() {
  const t = useTranslations("map");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [center, setCenter] = useState<GeoPoint>(DEFAULT_CENTER);
  const [userPoint, setUserPoint] = useState<GeoPoint | null>(null); // never persisted
  const [places, setPlaces] = useState<Place[]>([]);
  const [active, setActive] = useState<Set<PlaceCategory>>(new Set(CATS.map((c) => c.id)));
  const [status, setStatus] = useState<"idle" | "loading" | "ok">("idle");
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const retryMap = () => { setMapError(false); setMapKey((k) => k + 1); };

  // City search
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reqId = useRef(0);

  const activeCats = useMemo(() => [...active], [active]);

  const loadPlaces = useCallback(async (c: GeoPoint, cats: PlaceCategory[]) => {
    const id = ++reqId.current;
    setStatus("loading");
    const res = await fetchNearbyPlaces(c.lat, c.lon, cats);
    if (id !== reqId.current) return; // stale
    setPlaces(res);
    setStatus("ok");
  }, []);

  // (Re)load whenever the center or filters change.
  useEffect(() => {
    loadPlaces(center, activeCats);
  }, [center, activeCats, loadPlaces]);

  // City autocomplete
  useEffect(() => {
    clearTimeout(searchDebounce.current);
    if (query.trim().length < 2) { setSuggestions([]); return; }
    searchDebounce.current = setTimeout(async () => {
      setSuggestions(await geocodeCity(query.trim(), locale));
    }, 450);
    return () => clearTimeout(searchDebounce.current);
  }, [query, locale]);

  const pickCity = (g: GeoResult) => {
    setCenter({ lat: g.lat, lon: g.lon });
    setUserPoint(null);
    setQuery("");
    setSuggestions([]);
  };

  const locateMe = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setGeoMsg(t("unsupported")); return; }
    setGeoMsg(t("locating"));
    // Browser asks for consent here. The coordinates are only kept in memory.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pt = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserPoint(pt);
        setCenter(pt);
        setGeoMsg(null);
      },
      () => setGeoMsg(t("denied")),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
    );
  };

  const toggle = (c: PlaceCategory) => setActive((s) => {
    const n = new Set(s);
    n.has(c) ? n.delete(c) : n.add(c);
    return n.size ? n : new Set(CATS.map((x) => x.id)); // never empty
  });

  const origin = userPoint ?? center;
  const sorted = useMemo(
    () => [...places].map((p) => ({ p, d: distanceKm(origin, p) })).sort((a, b) => a.d - b.d),
    [places, origin]
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      {/* Search + locate */}
      <div className="relative flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-line bg-surface px-4 shadow-soft">
          <Search className="h-5 w-5 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchCity")} className="h-12 flex-1 bg-transparent text-sm outline-none" />
          {query && <button onClick={() => { setQuery(""); setSuggestions([]); }} aria-label="clear"><X className="h-4 w-4 text-muted" /></button>}
        </div>
        <Button variant="primary" size="icon" aria-label={t("nearMe")} onClick={locateMe}><LocateFixed className="h-5 w-5" /></Button>

        {suggestions.length > 0 && (
          <div className="absolute inset-x-0 top-14 z-[500] overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
            {suggestions.map((g, i) => (
              <button key={i} onClick={() => pickCity(g)} className="flex w-full items-start gap-2 px-4 py-2.5 text-start text-sm hover:bg-surface-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-natural" />
                <span className="line-clamp-2">{g.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {geoMsg && <p className="px-1 text-xs font-medium text-muted">{geoMsg}</p>}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <Chip key={c.id} active={active.has(c.id)} onClick={() => toggle(c.id)}>
            <c.icon className="h-3.5 w-3.5" /> {t(`filters.${c.id}`)}
          </Chip>
        ))}
      </div>

      {/* Map (with a premium fallback if Leaflet fails to load) */}
      <Card className="relative aspect-square overflow-hidden bg-surface-2 p-0 shadow-soft sm:aspect-video">
        {mapError ? (
          <div className="grid h-full w-full place-items-center p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface text-muted">
                <MapPinOff className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-semibold">{t("unavailable")}</p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-muted">{t("unavailableBody")}</p>
              </div>
              <Button variant="soft" size="sm" onClick={retryMap}><RotateCw className="h-4 w-4" /> {tc("retry")}</Button>
            </div>
          </div>
        ) : (
          <LeafletMap key={mapKey} center={center} places={places} userPoint={userPoint} onError={() => setMapError(true)} />
        )}
      </Card>

      {/* Privacy note */}
      <p className="flex items-center gap-1.5 px-1 text-center text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-natural" /> {t("privacyNote")}
      </p>

      {/* Results */}
      {status === "ok" && <p className="px-1 text-xs text-muted">{t("results", { n: sorted.length })}</p>}
      {status === "ok" && sorted.length === 0 && <EmptyState icon={MapPin} title={t("noResults")} description={t("searchHint")} />}
      <div className="space-y-2">
        {sorted.map(({ p, d }) => {
          const Icon = CAT_ICON[p.category];
          const dir = `https://www.openstreetmap.org/directions?from=${userPoint ? `${userPoint.lat},${userPoint.lon}` : ""}&to=${p.lat},${p.lon}`;
          return (
            <Card key={p.id} className="flex items-center gap-3 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-natural"><Icon className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="truncate text-xs text-muted">{[t(`filters.${p.category}`), p.address].filter(Boolean).join(" · ")}</p>
                <p className="text-[0.65rem] text-muted">{t("away", { km: d.toFixed(d < 10 ? 1 : 0) })}</p>
              </div>
              <a href={dir} target="_blank" rel="noreferrer">
                <Button variant="soft" size="sm"><Navigation className="h-4 w-4" /> {t("directions")}</Button>
              </a>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
