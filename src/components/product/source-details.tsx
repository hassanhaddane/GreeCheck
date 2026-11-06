"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { Product } from "@greecheck/domain/product/model";
import { NUTRIENT_FIELDS, type DataState } from "@greecheck/domain/product/provenance";
import { getCiqualReference } from "@/services/api/fallback/ciqual";

const authorities = { openfoodfacts: "Open Food Facts", usda: "USDA FoodData Central", ciqual: "Anses · Ciqual" };

export function ProductSourceDetails({ product, state }: { product: Product; state: DataState }) {
  const t = useTranslations("productData");
  const format = useFormatter();
  const source = product.provenance?.barcode;
  const category = product.source === "openfoodfacts" ? (product.categoryIds?.at(-1) ?? product.categories?.at(-1)) : undefined;
  const reference = category ? getCiqualReference(category) : undefined;
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: "medium", timeZone: "UTC" });
  const fieldName = (key: string) => t.has("fields." + key) ? t("fields." + key) : key;

  return (
    <div className="space-y-4 text-sm">
      {source && (
        <div className="space-y-1">
          <p className="font-semibold">{t("state." + state)}</p>
          <p className="text-muted">{t("retrieved", { date: date(source.retrievedAt) })} · {source.sourceVersion}</p>
          {source.originalUpdatedAt && <p className="text-muted">{t("sourceUpdated", { date: date(source.originalUpdatedAt) })}</p>}
          <dl className="grid gap-1 pt-2">
            {Object.entries(product.provenance ?? {}).map(([field, detail]) => (
              <div key={field} className="grid grid-cols-2 gap-2 border-b border-line py-1">
                <dt className="min-w-0 break-words">{fieldName(field.replaceAll(".", "_"))}</dt>
                <dd className="text-muted">
                  {detail.dataKind ? t("kind." + detail.dataKind) : t("missing." + (detail.missingReason ?? "not_reported"))}
                  {" · "}{t("confidence." + detail.confidence)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {!!product.conflicts?.length && (
        <section aria-label={t("conflictTitle")} className="space-y-2">
          <h3 className="font-semibold">{t("conflictTitle")}</h3>
          <p className="text-muted">{t("conflictBody")}</p>
          <ul className="space-y-2">
            {product.conflicts.map(conflict => (
              <li key={conflict.field}>
                <span className="font-medium">{fieldName("nutriments_" + conflict.field)} · {t(conflict.basis === "100ml" ? "perVolume" : "perMass")}</span>
                <ul className="text-muted">
                  {[conflict.primary, conflict.secondary].map(({ value, provenance }) => (
                    <li key={provenance.sourceId}>
                      <a className="underline" href={provenance.sourceUrl} target="_blank" rel="noreferrer">{authorities[provenance.sourceId]}</a>
                      {" · "}{format.number(value)} {conflict.unit}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {reference && (
        <section aria-label={t("referenceTitle")} className="space-y-2 rounded-2xl bg-surface-2 p-3">
          <h3 className="font-semibold">{t("referenceTitle")}</h3>
          <p className="text-muted">{t("referenceBody")}</p>
          <p>{reference.name} · {t("perMass")}</p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
            {NUTRIENT_FIELDS.map(field => {
              const value = reference.nutriments[field];
              if (value === undefined) return null;
              return (
                <div key={field}>
                  <dt>{fieldName("nutriments_" + field)}</dt>
                  <dd className="text-muted">{format.number(value)} {field === "energyKcal" ? "kcal" : "g"}</dd>
                </div>
              );
            })}
          </dl>
          <a className="underline" href={reference.provenance.sourceUrl} target="_blank" rel="noreferrer">
            Anses. 2025. Table de composition nutritionnelle des aliments Ciqual · {reference.code}
          </a>
        </section>
      )}
    </div>
  );
}
