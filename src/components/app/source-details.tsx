import { getTranslations } from "next-intl/server";
import { Database, ExternalLink } from "lucide-react";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";

const dataSources = [
  { id: "off", name: "Open Food Facts", url: "https://openfoodfacts.github.io/openfoodfacts-server/api/" },
  { id: "usda", name: "USDA FoodData Central", url: "https://fdc.nal.usda.gov/api-guide/" },
  { id: "ciqual", name: "Anses · Ciqual 2025", url: "https://doi.org/10.57745/RDMHWY" },
  { id: "science", name: "EFSA / Anses", url: "https://www.efsa.europa.eu/en/topics/topic/food-additives" }
] as const;

export async function SourceDetails() {
  const t = await getTranslations("methodology");
  const data = await getTranslations("dataMethodology");
  return (
    <GreeCard id="sources">
      <GreeCardContent className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Database className="h-4 w-4 text-natural-strong" aria-hidden /> {t("sourcesTitle")}
        </h2>
        <ul className="space-y-3">
          {dataSources.map(({ id, name, url }) => (
            <li key={id}>
              <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-natural-strong underline underline-offset-2">
                {name} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
              <p className="text-sm leading-relaxed text-muted">{data(id)}</p>
            </li>
          ))}
        </ul>
        <h3 className="pt-2 text-sm font-semibold">{data("qualityTitle")}</h3>
        <p className="text-sm leading-relaxed text-muted">{data("quality")}</p>
        <p className="text-sm leading-relaxed text-muted">{data("conflict")}</p>
        <h3 className="pt-2 text-sm font-semibold">{data("coverageTitle")}</h3>
        <p className="text-sm leading-relaxed text-muted">{data("coverage")}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li><a className="inline-flex min-h-8 items-center underline" href="https://world.openfoodfacts.org/terms-of-use">Open Food Facts · ODbL / CC BY-SA</a></li>
          <li><a className="inline-flex min-h-8 items-center underline" href="https://www.openstreetmap.org/copyright">© OpenStreetMap · ODbL</a></li>
          <li><a className="inline-flex min-h-8 items-center underline" href="https://github.com/etalab/licence-ouverte/blob/master/LO.md">Ciqual · Licence Ouverte</a></li>
        </ul>
      </GreeCardContent>
    </GreeCard>
  );
}
