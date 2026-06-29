"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MapPin, Search, LocateFixed } from "lucide-react";
import { PageHeading } from "@/components/layout/page-heading";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";

export default function MapPage() {
  const t = useTranslations("map");
  const locale = useLocale();
  const [active, setActive] = useState<string[]>(["bio"]);
  const filters = ["bio", "supermarket", "halal", "market", "grocery"] as const;
  const toggle = (id: string) => setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  return (
    <div className="space-y-5">
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-line bg-surface px-4 shadow-soft">
          <Search className="h-5 w-5 text-muted" />
          <input placeholder={t("searchCity")} className="h-12 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <Button variant="primary" size="icon" aria-label={t("nearMe")}>
          <LocateFixed className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Chip key={f} active={active.includes(f)} onClick={() => toggle(f)}>
            {t(`filters.${f}`)}
          </Chip>
        ))}
      </div>

      {/* Map placeholder (OpenStreetMap/Overpass to be wired) */}
      <Card className="relative aspect-[4/5] overflow-hidden bg-surface-2 p-0 sm:aspect-video">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(rgb(var(--gc-line)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--gc-line)) 1px, transparent 1px)",
            backgroundSize: "32px 32px"
          }}
        />
        {[
          { l: "32%", tp: "40%" },
          { l: "60%", tp: "55%" },
          { l: "48%", tp: "28%" }
        ].map((p, i) => (
          <span key={i} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: p.l, top: p.tp }}>
            <MapPin className="h-7 w-7 fill-natural text-deep drop-shadow" />
          </span>
        ))}
        <div className="absolute inset-x-0 bottom-0 gc-glass p-3 text-center text-xs text-muted">
          OpenStreetMap · Overpass · Nominatim
        </div>
      </Card>
    </div>
  );
}
