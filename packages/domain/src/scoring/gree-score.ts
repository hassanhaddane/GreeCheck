import type { Product } from "../product/model";
import type { LocalPreferences } from "../criteria/model";
import { ADDITIVE_EVIDENCE_VERSION, additiveEvidenceFor } from "./additive-evidence";
import { declaredProfile, nutritionTags, excluded, computePoints2023, officialGrade, pointsInRange } from "./nutrition-2023";
import { GRADE_BANDS, METHODOLOGY_UPDATED_AT, METHODOLOGY_VERSION, NUTRI_SCORE_REFERENCE, NUTRITION_ANCHORS } from "./methodology";
import type { GreeScore, NutritionComponent, ProductWarning, ScoreEvidence, ScoreExplanation, ScoreReason, UnscoredReasonCode } from "./types";
import { NUTRITION_THRESHOLDS as T } from "./thresholds";
import { halalStatusOf, matchingAllergens } from "./detectors";
import { specificOrganicLabelOf } from "./organic";

export { METHODOLOGY_VERSION } from "./methodology";

function warningsFor(p: Product, prefs: LocalPreferences): ProductWarning[] {
  const warnings: ProductWarning[] = [];
  const hits = matchingAllergens(p, prefs.avoidAllergens);
  if (hits.length) warnings.push({ level: "critical", code: "allergenPresent", values: { name: hits.join(", ") } });
  if (prefs.preferHalal || prefs.goals.includes("halal")) {
    const halal = halalStatusOf(p);
    if (halal === "incompatible") warnings.push({ level: "critical", code: "haramIngredient" });
    else if (halal === "check_required") warnings.push({ level: "warning", code: "halalCheckRequired" });
    else if (halal !== "confirmed") warnings.push({ level: "info", code: "halalNotConfirmed" });
  }
  if ((prefs.preferVegan || prefs.goals.includes("vegan")) && p.veganStatus === "incompatible") {
    warnings.push({ level: "warning", code: "veganMismatch" });
  }
  if ((prefs.preferVegetarian || prefs.goals.includes("vegetarian")) && p.vegetarianStatus === "incompatible") {
    warnings.push({ level: "warning", code: "vegetarianMismatch" });
  }
  return warnings;
}

function invalidAmounts(p: Product): boolean {
  const { energyKcal, ...grams } = p.nutriments;
  const valid = (value: number | undefined, max: number) => value === undefined || (Number.isFinite(value) && value >= 0 && value <= max);
  return !valid(energyKcal, 1000) || !valid(p.nutritionEnergyKj, 4200) ||
    !valid(p.fruitVegetableLegumePercent, 100) || Object.values(grams).some(value => !valid(value, 100)) ||
    (p.nutriments.fat !== undefined && p.nutriments.saturatedFat !== undefined && p.nutriments.saturatedFat > p.nutriments.fat + 0.1);
}

export function computeGreeScore(p: Product, preferences: LocalPreferences): GreeScore {
  const warnings = warningsFor(p, preferences);
  const alerts = warnings.filter(warning => warning.level === "critical");
  const evidence: ScoreEvidence = {
    officialMethod: { version: "2023", url: NUTRI_SCORE_REFERENCE },
    productSource: p.provenance?.barcode, fields: p.provenance,
    additives: p.additives?.map(code => ({ code, reference: additiveEvidenceFor(code) })),
    organicLabel: specificOrganicLabelOf(p.labels),
    novaGroup: p.novaGroup
  };
  const auxiliaryMissing = [
    ...(!p.ingredientsText?.trim() ? ["ingredients"] : []),
    ...(p.additives === undefined ? ["additives"] : []),
    ...(p.novaGroup === undefined ? ["nova"] : []),
    ...(!p.nutritionBasis ? ["nutritionBasis"] : [])
  ];
  const base = {
    methodologyVersion: METHODOLOGY_VERSION, methodologyUpdatedAt: METHODOLOGY_UPDATED_AT,
    registryVersion: ADDITIVE_EVIDENCE_VERSION, evidence, warnings, alerts
  };
  function unscored(code: UnscoredReasonCode, missing: string[] = []): GreeScore {
    const missingData = [...new Set([...missing, ...auxiliaryMissing])];
    return {
      ...base, status: "unscored", reason: { code }, missingData,
      verdict: code === "excluded_unsupported_category" ? "excluded_category"
        : code === "unknown_nutrition_category" ? "unsupported_category" : "insufficient_data",
      confidence: "low", confidenceReasons: missingData, reasons: [], topPositives: [], topNegatives: [],
      availableFacts: { nutriments: p.nutriments, ingredientsReported: Boolean(p.ingredientsText?.trim()), nutriScore: p.nutriScore, novaGroup: p.novaGroup },
      possibleActions: p.source === "openfoodfacts" && !p.origin ? ["inspect_facts", "check_source", "contribute"] : ["inspect_facts", "check_source"]
    };
  }

  const tags = nutritionTags(p);
  if (excluded(tags)) return unscored("excluded_unsupported_category");
  if (p.source === "ciqual" || Object.entries(p.provenance ?? {}).some(([field, provenance]) =>
    provenance?.dataKind === "category_reference" &&
    (field.startsWith("nutriments.") || ["nutriScore2023", "nutriScorePoints", "nutritionEnergyKj", "fruitVegetableLegumePercent", "nonNutritiveSweeteners"].includes(field))
  )) return unscored("missing_nutrition_data", ["productNutrition"]);
  if (p.dataState === "CONFLICTED" || p.conflicts?.length) return unscored("conflicting_nutrition_data");
  if (invalidAmounts(p)) return unscored("invalid_nutrition_data");

  const flat = p.nutriScoreVersion === "2023" && p.nutriScorePoints !== undefined
    ? { points: p.nutriScorePoints, grade: p.nutriScore, profile: undefined } : undefined;
  const nested = p.nutriScore2023;
  if (flat && nested && !nested.referenceOnly && (flat.points !== nested.points || (flat.grade && nested.grade && flat.grade !== nested.grade))) {
    return unscored("conflicting_nutrition_data");
  }
  const provided = nested?.referenceOnly ? undefined : nested ?? flat;
  const tagged = declaredProfile(tags);
  if (provided?.profile && tagged && tagged !== "general" && provided.profile !== tagged) return unscored("conflicting_nutrition_data");
  const profile = provided?.profile ?? tagged;
  if (!profile) return unscored("unknown_nutrition_category", ["nutritionCategory"]);

  let nutrition: NutritionComponent;
  const missingData = [...auxiliaryMissing];
  let reasons: ScoreReason[] = [];
  if (profile === "water") {
    const plain = provided?.profile === "water" || /^(?:eau(?: minérale(?: naturelle)?| de source)?(?: gazeuse)?|(?:natural mineral |mineral |spring |carbonated |sparkling )?water|agua(?: mineral(?: natural)?| con gas)?|ماء(?: معدني(?: طبيعي)?| نقي)?)[.!]?$/iu.test(p.ingredientsText?.trim() ?? "");
    if (!plain) return unscored("missing_nutrition_data", ["plainWater"]);
    if ((p.nutritionEnergyKj ?? 0) > 0 || Object.entries(p.nutriments).some(([key, value]) => key !== "salt" && value !== undefined && value > 0) || p.nonNutritiveSweeteners || p.additives?.length || (provided?.grade && provided.grade !== "a")) {
      return unscored("conflicting_nutrition_data");
    }
    nutrition = { profile, pointsSource: "plain_water", officialGrade: "a", contribution: 100 };
    reasons = [{ kind: "bonus", code: "gs3Water", impact: 1 }];
  } else {
    if (profile === "beverage" && p.nonNutritiveSweeteners === undefined) return unscored("missing_nutrition_data", ["nonNutritiveSweeteners"]);
    if (p.nutritionBasis && p.nutritionBasis !== (profile === "beverage" ? "100ml" : "100g")) return unscored("conflicting_nutrition_data");
    const local = computePoints2023(p, profile, tags);
    const calculated = "calculated" in local ? local.calculated : undefined;
    if (provided && (!pointsInRange(provided.points, profile) || (provided.grade && provided.grade !== officialGrade(provided.points, profile)) ||
      (calculated && calculated.points !== provided.points))) return unscored("conflicting_nutrition_data");
    if ("missing" in local) {
      if (!provided) return unscored("missing_nutrition_data", local.missing);
      missingData.push(...local.missing.filter(field => !missingData.includes(field)));
    }
    const points = provided?.points ?? calculated!.points;
    const [best, worst] = NUTRITION_ANCHORS[profile];
    const contribution = Math.round(Math.max(0, Math.min(profile === "beverage" ? 99 : 100, 100 * (worst - points) / (worst - best))));
    reasons = calculated?.factors.map(factor => ({ code: factor.code, kind: factor.kind, impact: factor.points, values: { points: factor.points } })) ?? [];
    if (!calculated && p.nutritionBasis) {
      const n = p.nutriments;
      const unit = p.nutritionBasis === "100ml" ? "ml" : "g";
      if (n.sugars !== undefined && n.sugars > T.sugarHigh) reasons.push({ kind: "malus", code: "gs3ReportedSugar", impact: 1, values: { value: n.sugars, unit } });
      if (n.salt !== undefined && n.salt > T.saltHigh) reasons.push({ kind: "malus", code: "gs3ReportedSalt", impact: 1, values: { value: n.salt, unit } });
    }
    nutrition = {
      points, pointsSource: provided ? "provider_2023" : "computed_2023", profile, contribution,
      officialGrade: officialGrade(points, profile),
      ...(calculated && { inputs: { negative: calculated.negative, positive: calculated.positive, factors: reasons } })
    };
  }

  const score = nutrition.contribution;
  const grade = GRADE_BANDS.find(band => score >= band.min)!.grade;
  const top = (kind: ScoreReason["kind"]) => reasons.filter(reason => reason.kind === kind).sort((a, b) => b.impact - a.impact).slice(0, 3);
  return {
    ...base, status: "scored", score, grade, components: { nutrition }, missingData,
    verdict: grade === "A" ? "excellent_choice" : grade === "B" ? "good_choice"
      : grade === "C" ? "mixed_profile" : grade === "D" ? "limit" : "low_profile",
    confidence: nutrition.pointsSource === "computed_2023" && p.provenance?.barcode?.validationStatus === "identity_checked" ? "high" : "medium",
    confidenceReasons: missingData, reasons, topPositives: top("bonus"), topNegatives: top("malus")
  };
}

export function explainScore(result: GreeScore): ScoreExplanation[] {
  if (result.status === "scored") return [{ code: "gs3Explanation" }];
  if (result.verdict === "excluded_category") return [{ code: "excludedCategory" }];
  if (result.verdict === "unsupported_category") return [{ code: "unsupportedCategory" }];
  return [{ code: "insufficientData" }];
}
