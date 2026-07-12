"use client";

import dynamic from "next/dynamic";
import { FormEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  Compass,
  ExternalLink,
  Leaf,
  LoaderCircle,
  LocateFixed,
  Map,
  MapPin,
  Navigation,
  Search,
  ShoppingBasket,
  Store
} from "lucide-react";
import { PLACE_TYPES, type PlaceSearchResult, type PlaceType } from "@/domains/discover/model";
import { PageHeading } from "@/components/app/page-heading";
import { GreeCard } from "@/components/system/gree-card";
import { GreeButton } from "@/components/system/gree-button";
import { cn } from "@/lib/utils/cn";

const DiscoverMap = dynamic(() => import("./discover-map").then((module) => module.DiscoverMap), {
  loading: () => <div className="h-72 animate-pulse rounded-3xl bg-surface-2 sm:h-96" />
});

const TYPE_ICONS = {
  supermarket: Building2,
  organic: Leaf,
  halal: Store,
  grocery: ShoppingBasket,
  market: Store
} satisfies Record<PlaceType, typeof Store>;

type SearchState = "idle" | "loading" | "ready" | "empty" | "error" | "location-denied";

function directionsUrl(lat: number, lon: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lon}`)}`;
}

export function DiscoverClient() {
  const t = useTranslations("discover");
  const [city, setCity] = useState("");
  const [types, setTypes] = useState<PlaceType[]>([...PLACE_TYPES]);
  const [state, setState] = useState<SearchState>("idle");
  const [result, setResult] = useState<PlaceSearchResult | null>(null);
  const [showMap, setShowMap] = useState(false);

  const selected = useMemo(() => new Set(types), [types]);

  async function runSearch(params: URLSearchParams) {
    setState("loading");
    setShowMap(false);
    params.set("types", types.join(","));
    try {
      const response = await fetch(`/api/places?${params}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("places_request_failed");
      const data = (await response.json()) as PlaceSearchResult;
      setResult(data);
      setState(data.places.length ? "ready" : "empty");
    } catch {
      setResult(null);
      setState("error");
    }
  }

  function submitCity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = city.trim();
    if (query.length < 2 || types.length === 0) return;
    void runSearch(new URLSearchParams({ city: query }));
  }

  function aroundMe() {
    if (!navigator.geolocation || types.length === 0) {
      setState("location-denied");
      return;
    }
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        void runSearch(new URLSearchParams({ lat: String(coords.latitude), lon: String(coords.longitude) }));
      },
      () => setState("location-denied"),
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 300000 }
    );
  }

  function toggleType(type: PlaceType) {
    setTypes((current) => current.includes(type) ? current.filter((value) => value !== type) : [...current, type]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeading title={t("title")} />
      <p className="flex items-start gap-2 px-1 text-sm leading-relaxed text-muted">
        <Compass className="mt-0.5 h-4 w-4 shrink-0 text-natural-strong" aria-hidden />
        {t("intro")}
      </p>

      <GreeCard className="space-y-4 p-5">
        <form onSubmit={submitCity} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="discover-city" className="sr-only">{t("cityLabel")}</label>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="discover-city"
              value={city}
              onChange={(event) => setCity(event.target.value.slice(0, 120))}
              placeholder={t("cityPlaceholder")}
              autoComplete="address-level2"
              className="h-12 w-full rounded-2xl border border-line bg-surface-2 pe-4 ps-11 text-sm outline-none focus:ring-2 focus:ring-natural/40"
            />
          </div>
          <GreeButton type="submit" variant="neon" disabled={city.trim().length < 2 || types.length === 0 || state === "loading"}>
            <Search className="h-4 w-4" aria-hidden /> {t("search")}
          </GreeButton>
        </form>

        <button
          type="button"
          onClick={aroundMe}
          disabled={state === "loading" || types.length === 0}
          className="gc-pressable flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-deep px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LocateFixed className="h-4 w-4" aria-hidden /> {t("aroundMe")}
        </button>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("filtersTitle")}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("filtersTitle")}>
            {PLACE_TYPES.map((type) => {
              const Icon = TYPE_ICONS[type];
              const active = selected.has(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  aria-pressed={active}
                  data-active={active}
                  className="gc-chip min-h-11"
                >
                  <Icon className="h-4 w-4" aria-hidden /> {t(`types.${type}`)}
                </button>
              );
            })}
          </div>
          {types.length === 0 && <p className="mt-2 text-xs text-score-d-ink">{t("selectFilter")}</p>}
        </div>
      </GreeCard>

      <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {t("locationNote")}
      </p>

      {state === "loading" && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted" role="status">
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden /> {t("loading")}
        </div>
      )}

      {(state === "error" || state === "location-denied" || state === "empty") && (
        <GreeCard className={cn("p-6 text-center", state === "error" && "border-score-d/30")} role="status">
          <p className="font-semibold">{t(`${state}.title`)}</p>
          <p className="mt-1 text-sm text-muted">{t(`${state}.body`)}</p>
        </GreeCard>
      )}

      {result && (state === "ready" || state === "empty") && (
        <section aria-labelledby="discover-results" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div>
              <h2 id="discover-results" className="text-base font-semibold">{t("resultsTitle", { n: result.places.length })}</h2>
              <p className="max-w-xl truncate text-xs text-muted">{result.center.label || t("aroundMeLabel")}</p>
            </div>
            {result.places.length > 0 && (
              <GreeButton variant="soft" size="sm" onClick={() => setShowMap((value) => !value)} aria-expanded={showMap}>
                <Map className="h-4 w-4" aria-hidden /> {showMap ? t("hideMap") : t("showMap")}
              </GreeButton>
            )}
          </div>

          {showMap && <DiscoverMap result={result} title={t("mapTitle")} />}

          <div className="grid gap-3 sm:grid-cols-2">
            {result.places.map((place) => {
              const Icon = TYPE_ICONS[place.type];
              return (
                <GreeCard key={place.id} className="flex min-w-0 flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-natural/10 text-natural-strong">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">{place.name || t("unknownPlace")}</h3>
                      <p className="text-xs font-medium text-natural-strong">{t(`types.${place.type}`)}</p>
                      {place.address && <p className="mt-1 text-xs leading-relaxed text-muted">{place.address}</p>}
                      {place.openingHours && <p className="mt-1 text-xs text-muted">{t("hours", { value: place.openingHours })}</p>}
                    </div>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <a
                      href={directionsUrl(place.lat, place.lon)}
                      target="_blank"
                      rel="noreferrer"
                      className="gc-pressable inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-deep px-3 text-xs font-semibold text-white"
                    >
                      <Navigation className="h-4 w-4" aria-hidden /> {t("directions")}
                    </a>
                    {place.website && (
                      <a
                        href={place.website}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t("websiteFor", { name: place.name || t("unknownPlace") })}
                        className="gc-pressable grid h-11 w-11 place-items-center rounded-2xl bg-surface-2 text-muted"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden />
                      </a>
                    )}
                  </div>
                </GreeCard>
              );
            })}
          </div>
          <p className="text-center text-xs text-muted">{result.attribution}</p>
        </section>
      )}
    </div>
  );
}
