"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Search, LocateFixed, X, MapPin, MapPinOff, RotateCw, Navigation, Store, Leaf, BadgeCheck, ShoppingCart, Tent, ShieldCheck, AlertTriangle } from "lucide-react";
import { PageHeading } from "@/components/app/page-heading";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { geocodeFrance, fetchNearbyPlaces } from "@/lib/api/places";
import type { Place, PlaceCategory, GeoPoint, GeoResult } from "@/types/place";

const LeafletMap = dynamic(() => import("@/components/map/leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <div className="grid h-full w-full place-items-center bg-surface-2 text-sm text-muted">…</div>
});

type FilterCat = Exclude<PlaceCategory, "unknown">;

const CATS: { id: FilterCat; icon: typeof Store }[] = [
  { id: "supermarket", icon: Store },
  { id: "bio", icon: Leaf },
  { id: "halal", icon: BadgeCheck },
  { id: "grocery", icon: ShoppingCart },
  { id: "market", icon: Tent }
];
const CAT_ICON: Record<PlaceCategory, typeof Store> = {
  supermarket: Store, bio: Leaf, halal: BadgeCheck, grocery: ShoppingCart, market: Tent, unknown: Store
};

// France-only for now — default view on Paris.
const DEFAULT_CENTER: GeoPoint = { lat: 48.8566, lon: 2.3522 };
const RADIUS_M = 2500;

export default function MapPage() {
  const t = useTranslations("map");
  const tc = useTranslations("common");

  const [center, setCenter] = useState<GeoPoint>(DEFAULT_CENTER);
  const [userPoint, setUserPoint] = useState<GeoPoint | null>(null); // never persisted
  const [places, setPlaces] = useState<Place[]>([]); // ALL loaded places (every category)
  const [active, setActive] = useState<Set<FilterCat>>(new Set(CATS.map((c) => c.id)));
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [mapError, setMapError] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const retryMap = () => { setMapError(false); setMapKey((k) => k + 1); };

  // City search — France only, via BAN. No aggressive autocomplete.
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  /**
   * Load places ONCE per location: a single wide request covering every
   * category. Filter chips below only filter this list client-side.
   */
  const loadPlaces = useCallback(async (c: GeoPoint) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    try {
      const res = await fetchNearbyPlaces(c.lat, c.lon, RADIUS_M, controller.signal);
      if (controller.signal.aborted) return;
      setPlaces(res);
      setStatus("ok");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStatus("error"); // previously loaded markers stay visible
    }
  }, []);

  // Reload only when the CENTER changes — never on filter toggles.
  useEffect(() => {
    // Defer so loadPlaces' initial setState isn't synchronous in the effect body.
    const id = setTimeout(() => loadPlaces(center), 0);
    return () => clearTimeout(id);
  }, [center, loadPlaces]);

  // Long-debounced (800ms) suggestions; a submit triggers the search instantly.
  useEffect(() => {
    clearTimeout(searchDebounce.current);
    const q = query.trim();
    if (q.length < 2) {
      searchDebounce.current = setTimeout(() => setSuggestions([]), 0);
      return () => clearTimeout(searchDebounce.current);
    }
    searchDebounce.current = setTimeout(async () => {
      setSuggestions(await geocodeFrance(q));
    }, 800);
    return () => clearTimeout(searchDebounce.current);
  }, [query]);

  const submitSearch = async () => {
    const q = query.trim();
    if (q.length < 2 || searching) return;
    clearTimeout(searchDebounce.current);
    setSearching(true);
    const results = await geocodeFrance(q);
    setSearching(false);
    if (results.length === 1) pickCity(results[0]);
    else setSuggestions(results);
  };

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

  // Instant, client-side only — no server call.
  const toggle = (c: FilterCat) => setActive((s) => {
    const n = new Set(s);
    if (n.has(c)) n.delete(c); else n.add(c);
    return n.size ? n : new Set(CATS.map((x) => x.id)); // never empty
  });

  const visible = useMemo(
    () => places
      .filter((p) => active.has(p.category as FilterCat))
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0)),
    [places, active]
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      {/* Search + locate — France only */}
      <div className="relative flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-line bg-surface px-4 shadow-soft">
          <Search className="h-5 w-5 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitSearch()}
            placeholder={t("searchCity")}
            className="h-12 flex-1 bg-transparent text-sm outline-none"
            aria-label={t("searchCity")}
          />
          {query && <button onClick={() => { setQuery(""); setSuggestions([]); }} aria-label="clear"><X className="h-4 w-4 text-muted" /></button>}
        </div>
        <Button variant="soft" size="icon" aria-label={t("searchAction")} onClick={submitSearch} disabled={searching}>
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="primary" size="icon" aria-label={t("nearMe")} onClick={locateMe}><LocateFixed className="h-5 w-5" /></Button>

        {suggestions.length > 0 && (
          <div className="absolute inset-x-0 top-14 z-[500] overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
            {suggestions.map((g, i) => (
              <button key={i} onClick={() => pickCity(g)} className="flex w-full items-start gap-2 px-4 py-2.5 text-start text-sm hover:bg-surface-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-natural" />
                <span className="line-clamp-2">{g.name}{g.postcode ? ` — ${g.postcode}` : ""}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {geoMsg && <p className="px-1 text-xs font-medium text-muted">{geoMsg}</p>}

      {/* Filters — instant, client-side only */}
      <div className="flex flex-wrap items-center gap-2">
        {CATS.map((c) => (
          <Chip key={c.id} active={active.has(c.id)} onClick={() => toggle(c.id)}>
            <c.icon className="h-3.5 w-3.5" /> {t(`filters.${c.id}`)}
          </Chip>
        ))}
        <button
          type="button"
          onClick={() => loadPlaces(center)}
          disabled={status === "loading"}
          className="ms-auto flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-semibold text-natural disabled:opacity-50"
        >
          <RotateCw className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`} /> {t("refresh")}
        </button>
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
          <LeafletMap key={mapKey} center={center} places={visible} userPoint={userPoint} onError={() => setMapError(true)} />
        )}
        {status === "loading" && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[400] flex justify-center">
            <span className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">{t("loadingPlaces")}</span>
          </div>
        )}
      </Card>

      {/* Privacy note */}
      <p className="flex items-center gap-1.5 px-1 text-center text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-natural" /> {t("privacyNote")}
      </p>

      {/* Places API error — keep whatever was already loaded */}
      {status === "error" && (
        <Card className="border-score-d/25 bg-score-d/5 p-4">
          <p className="flex items-start gap-2 text-sm font-semibold text-score-d">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {t("placesError")}
          </p>
          <Button className="mt-3" variant="soft" size="sm" onClick={() => loadPlaces(center)}>
            <RotateCw className="h-4 w-4" /> {tc("retry")}
          </Button>
        </Card>
      )}

      {/* Results */}
      {status === "ok" && <p className="px-1 text-xs text-muted">{t("results", { n: visible.length })}</p>}
      {status === "ok" && visible.length === 0 && (
        <EmptyState icon={MapPin} title={t("noResults")} description={places.length > 0 ? t("noResultsFilters") : t("searchHint")} />
      )}
      <div className="space-y-2">
        {visible.map((p) => {
          const Icon = CAT_ICON[p.category];
          const dir = `https://www.openstreetmap.org/directions?from=${userPoint ? `${userPoint.lat},${userPoint.lon}` : ""}&to=${p.lat},${p.lon}`;
          const km = (p.distanceMeters ?? 0) / 1000;
          return (
            <Card key={p.id} className="gc-lift flex items-center gap-3 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-natural"><Icon className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {p.name}
                  {p.inferred && <span className="ms-2 rounded-full bg-score-c/12 px-2 py-0.5 text-[0.6rem] font-medium text-score-c align-middle">{t("inferred")}</span>}
                </p>
                <p className="truncate text-xs text-muted">{[t(`filters.${p.category === "unknown" ? "supermarket" : p.category}`), p.address].filter(Boolean).join(" · ")}</p>
                <p className="text-[0.65rem] text-muted">{t("away", { km: km.toFixed(km < 10 ? 1 : 0) })}</p>
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
