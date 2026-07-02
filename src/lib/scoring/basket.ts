import type { Product } from "@/types/product";
import type { GreeScore, ScoreGrade } from "@/types/scoring";
import type { LocalPreferences } from "@/types/user-preferences";
import { computeGreeScore } from "@/lib/scoring/gree-score";

export type BasketLabelKey = "excellent" | "good" | "mixed" | "needsImprovement" | "poor";
export type BasketConfidenceLevel = "high" | "medium" | "low";
export type BasketSeverity = "info" | "warning" | "critical";
export type BasketIssueKey =
  | "allergenConflict"
  | "halalConflict"
  | "halalUnknown"
  | "veganConflict"
  | "vegetarianConflict"
  | "nova4"
  | "highSugar"
  | "highSalt"
  | "highSatFat"
  | "manyAdditives"
  | "missingData"
  | "missingNova"
  | "lowScore"
  | "notBio";

export interface BasketMessage {
  key: string;
  severity?: BasketSeverity;
  values?: Record<string, number | string>;
}

export interface BasketProductIssue {
  key: BasketIssueKey;
  severity: BasketSeverity;
  penalty: number;
  values?: Record<string, number | string>;
}

export interface BasketInput {
  product: Product;
  gree?: GreeScore;
  legacyScore?: number;
}

export interface BasketProductAnalysis {
  product: Product;
  gree: GreeScore;
  baseScore: number;
  effectiveScore: number;
  dragPenalty: number;
  issues: BasketProductIssue[];
  missingCriticalData: boolean;
  allergenConflict: boolean;
  preferenceConflict: boolean;
  replacementReasonKey: BasketIssueKey | "betterFit";
  estimatedUpgradeGain: number;
}

export interface BasketCompatibility {
  active: boolean;
  compatible: number;
  incompatible: number;
  unknown: number;
  ratio: number;
}

export interface BasketNutritionMetric {
  average?: number;
  known: number;
  high: number;
  low: number;
  status: "good" | "watch" | "high" | "missing";
  preferenceActive: boolean;
}

export interface BasketScoreResult {
  global: number;
  grade: ScoreGrade;
  labelKey: BasketLabelKey;
  confidenceLevel: BasketConfidenceLevel;
  confidenceScore: number;
  verdict: BasketMessage;
  positiveInsights: BasketMessage[];
  warnings: BasketMessage[];
  mainRisk: BasketMessage;
  mainStrength: BasketMessage;
  productsDraggingScore: BasketProductAnalysis[];
  productsImprovingBasket: BasketProductAnalysis[];
  recommendedReplacements: BasketProductAnalysis[];
  analyses: BasketProductAnalysis[];
  metrics: {
    productCount: number;
    excellentProducts: number;
    productsToImprove: number;
    averageGreeScore: number;
    averageNova?: number;
    novaKnown: number;
    missingCriticalData: number;
    allergenConflicts: number;
    highSugarProducts: number;
    highSaltProducts: number;
    nova4Products: number;
    manyAdditivesProducts: number;
    lowScoreProducts: number;
    bioRatio: number;
    halalRatio: number;
  };
  distributions: {
    nutriScore: Record<"a" | "b" | "c" | "d" | "e" | "unknown", number>;
    nova: Record<"1" | "2" | "3" | "4" | "unknown", number>;
    greeScore: Record<ScoreGrade, number>;
  };
  compatibility: {
    bio: BasketCompatibility;
    halal: BasketCompatibility;
    vegan: BasketCompatibility;
    vegetarian: BasketCompatibility;
  };
  nutritionBalance: {
    sugar: BasketNutritionMetric;
    salt: BasketNutritionMetric;
    saturatedFat: BasketNutritionMetric;
    protein: BasketNutritionMetric;
    fiber: BasketNutritionMetric;
  };
}

const T = {
  sugarLow: 5,
  sugarHigh: 22.5,
  saltLow: 0.3,
  saltHigh: 1.5,
  satFatLow: 1.5,
  satFatHigh: 5,
  proteinOk: 8,
  proteinHigh: 12,
  fiberOk: 3,
  fiberHigh: 6
} as const;

const HARAM_KEYWORDS = [
  "pork",
  "porc",
  "lard",
  "bacon",
  "ham",
  "jambon",
  "gelatin",
  "gelatine",
  "gélatine",
  "alcohol",
  "alcool",
  "wine",
  "vin",
  "beer",
  "biere",
  "bière",
  "rum",
  "rhum",
  "vodka",
  "ethanol"
];

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);
const ratio = (part: number, total: number) => (total ? part / total : 0);
const hasGoal = (prefs: LocalPreferences, goal: LocalPreferences["goals"][number]) => prefs.goals.includes(goal);

function gradeForBasket(score: number): { grade: ScoreGrade; labelKey: BasketLabelKey } {
  if (score >= 80) return { grade: "A", labelKey: "excellent" };
  if (score >= 65) return { grade: "B", labelKey: "good" };
  if (score >= 50) return { grade: "C", labelKey: "mixed" };
  if (score >= 35) return { grade: "D", labelKey: "needsImprovement" };
  return { grade: "E", labelKey: "poor" };
}

function hasAnyNutrition(product: Product): boolean {
  return Object.values(product.nutriments).some((value) => value !== undefined);
}

function hasIngredientsData(product: Product): boolean {
  return Boolean(product.ingredientsText?.trim()) || (product.additives?.length ?? 0) > 0 || (product.allergens?.length ?? 0) > 0;
}

function includesNeedle(haystack: string, needle: string): boolean {
  const n = needle.trim().toLowerCase();
  return Boolean(n) && haystack.toLowerCase().includes(n);
}

function hasAllergenConflict(product: Product, prefs: LocalPreferences): boolean {
  if (!prefs.avoidAllergens.length) return false;
  const haystack = [
    product.ingredientsText ?? "",
    ...(product.allergens ?? []),
    ...(product.traces ?? [])
  ].join(" ");
  return prefs.avoidAllergens.some((allergen) => includesNeedle(haystack, allergen));
}

function detectHaram(product: Product): boolean {
  const haystack = `${product.ingredientsText ?? ""} ${(product.labels ?? []).join(" ")}`.toLowerCase();
  return HARAM_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function addIssue(
  issues: BasketProductIssue[],
  key: BasketIssueKey,
  severity: BasketSeverity,
  penalty: number,
  values?: Record<string, number | string>
) {
  issues.push({ key, severity, penalty, values });
}

function issueReason(issues: BasketProductIssue[]): BasketIssueKey | "betterFit" {
  const priority: BasketIssueKey[] = [
    "allergenConflict",
    "halalConflict",
    "veganConflict",
    "vegetarianConflict",
    "nova4",
    "highSugar",
    "highSalt",
    "manyAdditives",
    "missingData",
    "lowScore",
    "notBio",
    "highSatFat",
    "halalUnknown",
    "missingNova"
  ];
  return priority.find((key) => issues.some((issue) => issue.key === key)) ?? "betterFit";
}

function analyzeProduct(input: BasketInput, prefs: LocalPreferences): BasketProductAnalysis {
  const product = input.product;
  const gree = input.gree ?? computeGreeScore(product, prefs);
  const n = product.nutriments;
  const issues: BasketProductIssue[] = [];
  const activeHalal = prefs.preferHalal || hasGoal(prefs, "halal");
  const activeBio = prefs.preferBio || hasGoal(prefs, "go_organic");
  const activeVegan = prefs.preferVegan || hasGoal(prefs, "vegan");
  const activeVegetarian = prefs.preferVegetarian || hasGoal(prefs, "vegetarian");
  const activeSugar = prefs.reduceSugar || hasGoal(prefs, "reduce_sugar");
  const activeSalt = prefs.reduceSalt || hasGoal(prefs, "reduce_salt");
  const activeAdditives = prefs.reduceAdditives || hasGoal(prefs, "reduce_additives");
  const activeUltraProcessed = prefs.reduceUltraProcessed || hasGoal(prefs, "avoid_ultraprocessed");
  const missingNutrition = !product.nutriScore && !hasAnyNutrition(product);
  const missingIngredients = !hasIngredientsData(product);
  const missingCriticalData = missingNutrition || missingIngredients;

  if (hasAllergenConflict(product, prefs)) {
    addIssue(issues, "allergenConflict", "critical", 35);
  }
  if (activeHalal && detectHaram(product)) {
    addIssue(issues, "halalConflict", "critical", 28);
  } else if (activeHalal && !product.isHalal) {
    addIssue(issues, "halalUnknown", "warning", 8);
  }
  if (activeVegan && !product.isVegan) {
    addIssue(issues, "veganConflict", "critical", 26);
  }
  if (activeVegetarian && !product.isVegetarian && !product.isVegan) {
    addIssue(issues, "vegetarianConflict", "warning", 18);
  }
  if (product.novaGroup === 4) {
    addIssue(issues, "nova4", "warning", activeUltraProcessed ? 20 : 14);
  } else if (!product.novaGroup) {
    addIssue(issues, "missingNova", "info", 4);
  }
  if (n.sugars !== undefined && n.sugars > T.sugarHigh) {
    addIssue(issues, "highSugar", "warning", activeSugar ? 16 : 8, { value: n.sugars });
  }
  if (n.salt !== undefined && n.salt > T.saltHigh) {
    addIssue(issues, "highSalt", "warning", activeSalt ? 14 : 7, { value: n.salt });
  }
  if (n.saturatedFat !== undefined && n.saturatedFat > T.satFatHigh) {
    addIssue(issues, "highSatFat", "info", 6, { value: n.saturatedFat });
  }

  const additiveCount = product.additives?.length ?? 0;
  if (additiveCount >= 4) {
    addIssue(issues, "manyAdditives", "warning", activeAdditives ? 15 : 9, { count: additiveCount });
  }
  if (missingCriticalData) {
    addIssue(issues, "missingData", "warning", 12);
  }
  if (activeBio && !product.isBio) {
    addIssue(issues, "notBio", "info", activeBio ? 6 : 3);
  }
  if (gree.global < 35) {
    addIssue(issues, "lowScore", "warning", 14, { score: gree.global });
  } else if (gree.global < 50) {
    addIssue(issues, "lowScore", "info", 7, { score: gree.global });
  }

  const baseScore = round(
    gree.global * 0.38 +
      gree.healthScore * 0.18 +
      gree.processingScore * 0.15 +
      gree.additivesScore * 0.12 +
      gree.goalScore * 0.1 +
      gree.naturalityScore * 0.07
  );
  const penalty = issues.reduce((sum, issue) => sum + issue.penalty, 0);
  const effectiveScore = clamp(round(baseScore - penalty));
  const replacementReasonKey = issueReason(issues);
  const estimatedTarget = clamp(Math.max(72, Math.min(90, effectiveScore + 28)));
  const estimatedUpgradeGain = Math.max(0, round(estimatedTarget - effectiveScore));

  return {
    product,
    gree,
    baseScore,
    effectiveScore,
    dragPenalty: Math.max(0, baseScore - effectiveScore),
    issues,
    missingCriticalData,
    allergenConflict: issues.some((issue) => issue.key === "allergenConflict"),
    preferenceConflict: issues.some((issue) =>
      ["halalConflict", "veganConflict", "vegetarianConflict"].includes(issue.key)
    ),
    replacementReasonKey,
    estimatedUpgradeGain
  };
}

function average(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function nutritionMetric(
  analyses: BasketProductAnalysis[],
  key: keyof Product["nutriments"],
  low: number,
  high: number,
  preferenceActive: boolean,
  higherIsBetter = false
): BasketNutritionMetric {
  const values = analyses
    .map((analysis) => analysis.product.nutriments[key])
    .filter((value): value is number => typeof value === "number");
  const avg = average(values);
  if (avg === undefined) {
    return { known: 0, high: 0, low: 0, status: "missing", preferenceActive };
  }

  const highCount = higherIsBetter
    ? values.filter((value) => value >= high).length
    : values.filter((value) => value > high).length;
  const lowCount = higherIsBetter
    ? values.filter((value) => value < low).length
    : values.filter((value) => value <= low).length;

  let status: BasketNutritionMetric["status"];
  if (higherIsBetter) {
    status = avg >= high ? "good" : avg >= low ? "watch" : "high";
  } else {
    status = avg <= low ? "good" : avg > high ? "high" : "watch";
  }

  return {
    average: Number(avg.toFixed(1)),
    known: values.length,
    high: highCount,
    low: lowCount,
    status,
    preferenceActive
  };
}

function makeCompatibility(
  analyses: BasketProductAnalysis[],
  active: boolean,
  kind: "bio" | "halal" | "vegan" | "vegetarian"
): BasketCompatibility {
  let compatible = 0;
  let incompatible = 0;
  let unknown = 0;

  for (const { product } of analyses) {
    if (kind === "bio") {
      product.isBio ? compatible++ : incompatible++;
    } else if (kind === "halal") {
      if (product.isHalal) compatible++;
      else if (detectHaram(product)) incompatible++;
      else unknown++;
    } else if (kind === "vegan") {
      product.isVegan ? compatible++ : incompatible++;
    } else {
      product.isVegetarian || product.isVegan ? compatible++ : incompatible++;
    }
  }

  return { active, compatible, incompatible, unknown, ratio: ratio(compatible, analyses.length) };
}

function buildDistributions(analyses: BasketProductAnalysis[]): BasketScoreResult["distributions"] {
  const nutriScore: BasketScoreResult["distributions"]["nutriScore"] = {
    a: 0,
    b: 0,
    c: 0,
    d: 0,
    e: 0,
    unknown: 0
  };
  const nova: BasketScoreResult["distributions"]["nova"] = { "1": 0, "2": 0, "3": 0, "4": 0, unknown: 0 };
  const greeScore: BasketScoreResult["distributions"]["greeScore"] = { A: 0, B: 0, C: 0, D: 0, E: 0 };

  for (const analysis of analyses) {
    const nutri = analysis.product.nutriScore;
    nutri ? nutriScore[nutri]++ : nutriScore.unknown++;
    const novaGroup = analysis.product.novaGroup;
    novaGroup ? nova[String(novaGroup) as "1" | "2" | "3" | "4"]++ : nova.unknown++;
    greeScore[analysis.gree.grade]++;
  }

  return { nutriScore, nova, greeScore };
}

function message(key: string, values?: Record<string, number | string>, severity?: BasketSeverity): BasketMessage {
  return { key, values, severity };
}

function chooseMainRisk(metrics: BasketScoreResult["metrics"]): BasketMessage {
  if (metrics.allergenConflicts) return message("allergenConflicts", { count: metrics.allergenConflicts }, "critical");
  if (metrics.nova4Products) return message("nova4", { count: metrics.nova4Products }, "warning");
  if (metrics.highSugarProducts) return message("highSugar", { count: metrics.highSugarProducts }, "warning");
  if (metrics.highSaltProducts) return message("highSalt", { count: metrics.highSaltProducts }, "warning");
  if (metrics.manyAdditivesProducts) return message("manyAdditives", { count: metrics.manyAdditivesProducts }, "warning");
  if (metrics.missingCriticalData) return message("missingData", { count: metrics.missingCriticalData }, "warning");
  if (metrics.lowScoreProducts) return message("lowScore", { count: metrics.lowScoreProducts }, "warning");
  return message("none");
}

function chooseMainStrength(
  analyses: BasketProductAnalysis[],
  metrics: BasketScoreResult["metrics"],
  compatibility: BasketScoreResult["compatibility"],
  nutritionBalance: BasketScoreResult["nutritionBalance"],
  prefs: LocalPreferences
): BasketMessage {
  const total = analyses.length;
  const strongNutri = analyses.filter((analysis) => ["a", "b"].includes(analysis.product.nutriScore ?? "")).length;
  const lowProcessed = analyses.filter((analysis) => (analysis.product.novaGroup ?? 9) <= 2).length;
  const cleanAdditives = analyses.filter((analysis) => (analysis.product.additives?.length ?? 0) === 0).length;

  if (ratio(strongNutri, total) >= 0.6) return message("strongNutri", { count: strongNutri });
  if (ratio(lowProcessed, total) >= 0.6) return message("lowProcessed", { count: lowProcessed });
  if (ratio(cleanAdditives, total) >= 0.6) return message("lowAdditives", { count: cleanAdditives });
  if ((prefs.increaseProtein || hasGoal(prefs, "high_protein")) && nutritionBalance.protein.status === "good") {
    return message("protein");
  }
  if ((prefs.increaseFiber || hasGoal(prefs, "high_fiber")) && nutritionBalance.fiber.status === "good") {
    return message("fiber");
  }
  if (compatibility.bio.active && metrics.bioRatio >= 0.5) return message("bio");
  if (compatibility.halal.active && metrics.halalRatio >= 0.5) return message("halal");
  return message("balanced");
}

function chooseVerdict(score: number, metrics: BasketScoreResult["metrics"], prefs: LocalPreferences): BasketMessage {
  const activeHalal = prefs.preferHalal || hasGoal(prefs, "halal");

  if (metrics.allergenConflicts) return message("allergenConflict", { count: metrics.allergenConflicts }, "critical");
  if (score >= 80 && metrics.nova4Products === 0 && metrics.highSugarProducts === 0 && metrics.manyAdditivesProducts === 0) {
    return message("excellentClean");
  }
  if (activeHalal && metrics.halalRatio === 1) return message("halalMatch");
  if (score >= 65 && metrics.nova4Products > 0) return message("goodButProcessed", { count: metrics.nova4Products });
  if (score >= 65 && metrics.highSugarProducts > 0) return message("goodButSugar", { count: metrics.highSugarProducts });
  if (score < 45 && metrics.nova4Products > 0 && metrics.highSugarProducts > 0) {
    return message("poorProcessedSugar", { nova: metrics.nova4Products, sugar: metrics.highSugarProducts }, "warning");
  }
  if (metrics.missingCriticalData > 0) return message("partial", { count: metrics.missingCriticalData }, "warning");
  if (score >= 65) return message("goodOverall");
  if (score >= 50) return message("mixed");
  return message("poor");
}

function confidenceLevel(score: number): BasketConfidenceLevel {
  if (score >= 82) return "high";
  if (score >= 58) return "medium";
  return "low";
}

export function computeBasketScore(inputs: BasketInput[], prefs: LocalPreferences): BasketScoreResult {
  const analyses = inputs.map((input) => analyzeProduct(input, prefs));
  const productCount = analyses.length;

  if (!productCount) {
    const emptyCompatibility = { active: false, compatible: 0, incompatible: 0, unknown: 0, ratio: 0 };
    const emptyMetric = { known: 0, high: 0, low: 0, status: "missing", preferenceActive: false } as const;
    return {
      global: 0,
      grade: "E",
      labelKey: "poor",
      confidenceLevel: "low",
      confidenceScore: 0,
      verdict: message("empty"),
      positiveInsights: [],
      warnings: [],
      mainRisk: message("none"),
      mainStrength: message("balanced"),
      productsDraggingScore: [],
      productsImprovingBasket: [],
      recommendedReplacements: [],
      analyses: [],
      metrics: {
        productCount: 0,
        excellentProducts: 0,
        productsToImprove: 0,
        averageGreeScore: 0,
        novaKnown: 0,
        missingCriticalData: 0,
        allergenConflicts: 0,
        highSugarProducts: 0,
        highSaltProducts: 0,
        nova4Products: 0,
        manyAdditivesProducts: 0,
        lowScoreProducts: 0,
        bioRatio: 0,
        halalRatio: 0
      },
      distributions: {
        nutriScore: { a: 0, b: 0, c: 0, d: 0, e: 0, unknown: 0 },
        nova: { "1": 0, "2": 0, "3": 0, "4": 0, unknown: 0 },
        greeScore: { A: 0, B: 0, C: 0, D: 0, E: 0 }
      },
      compatibility: {
        bio: emptyCompatibility,
        halal: emptyCompatibility,
        vegan: emptyCompatibility,
        vegetarian: emptyCompatibility
      },
      nutritionBalance: {
        sugar: emptyMetric,
        salt: emptyMetric,
        saturatedFat: emptyMetric,
        protein: emptyMetric,
        fiber: emptyMetric
      }
    };
  }

  const distributions = buildDistributions(analyses);
  const compatibility = {
    bio: makeCompatibility(analyses, prefs.preferBio || hasGoal(prefs, "go_organic"), "bio"),
    halal: makeCompatibility(analyses, prefs.preferHalal || hasGoal(prefs, "halal"), "halal"),
    vegan: makeCompatibility(analyses, prefs.preferVegan || hasGoal(prefs, "vegan"), "vegan"),
    vegetarian: makeCompatibility(analyses, prefs.preferVegetarian || hasGoal(prefs, "vegetarian"), "vegetarian")
  };
  const nutritionBalance = {
    sugar: nutritionMetric(analyses, "sugars", T.sugarLow, T.sugarHigh, prefs.reduceSugar || hasGoal(prefs, "reduce_sugar")),
    salt: nutritionMetric(analyses, "salt", T.saltLow, T.saltHigh, prefs.reduceSalt || hasGoal(prefs, "reduce_salt")),
    saturatedFat: nutritionMetric(analyses, "saturatedFat", T.satFatLow, T.satFatHigh, false),
    protein: nutritionMetric(
      analyses,
      "proteins",
      T.proteinOk,
      T.proteinHigh,
      prefs.increaseProtein || hasGoal(prefs, "high_protein") || hasGoal(prefs, "build_muscle"),
      true
    ),
    fiber: nutritionMetric(analyses, "fiber", T.fiberOk, T.fiberHigh, prefs.increaseFiber || hasGoal(prefs, "high_fiber"), true)
  };

  const effectiveAverage = round(analyses.reduce((sum, analysis) => sum + analysis.effectiveScore, 0) / productCount);
  const averageGreeScore = round(analyses.reduce((sum, analysis) => sum + analysis.gree.global, 0) / productCount);
  const knownNova = analyses.map((analysis) => analysis.product.novaGroup).filter((value): value is 1 | 2 | 3 | 4 => Boolean(value));
  const averageNova = average(knownNova);
  const excellentProducts = analyses.filter((analysis) => analysis.gree.global >= 80).length;
  const productsToImprove = analyses.filter(
    (analysis) => analysis.effectiveScore < 62 || analysis.issues.some((issue) => issue.severity !== "info")
  ).length;
  const missingCriticalData = analyses.filter((analysis) => analysis.missingCriticalData).length;
  const allergenConflicts = analyses.filter((analysis) => analysis.issues.some((issue) => issue.key === "allergenConflict")).length;
  const highSugarProducts = analyses.filter((analysis) => analysis.issues.some((issue) => issue.key === "highSugar")).length;
  const highSaltProducts = analyses.filter((analysis) => analysis.issues.some((issue) => issue.key === "highSalt")).length;
  const nova4Products = distributions.nova["4"];
  const manyAdditivesProducts = analyses.filter((analysis) => analysis.issues.some((issue) => issue.key === "manyAdditives")).length;
  const lowScoreProducts = analyses.filter((analysis) => analysis.gree.global < 50).length;

  const metrics: BasketScoreResult["metrics"] = {
    productCount,
    excellentProducts,
    productsToImprove,
    averageGreeScore,
    averageNova: averageNova === undefined ? undefined : Number(averageNova.toFixed(1)),
    novaKnown: knownNova.length,
    missingCriticalData,
    allergenConflicts,
    highSugarProducts,
    highSaltProducts,
    nova4Products,
    manyAdditivesProducts,
    lowScoreProducts,
    bioRatio: compatibility.bio.ratio,
    halalRatio: compatibility.halal.ratio
  };

  let global = effectiveAverage;
  const warnings: BasketMessage[] = [];
  const addWarning = (key: string, count: number, severity: BasketSeverity = "warning") => {
    if (count > 0) warnings.push(message(key, { count }, severity));
  };

  if (allergenConflicts) global -= Math.min(30, 18 + allergenConflicts * 8);
  if (nova4Products) global -= Math.min(18, nova4Products * (prefs.reduceUltraProcessed || hasGoal(prefs, "avoid_ultraprocessed") ? 8 : 5));
  if (highSugarProducts) global -= Math.min(16, highSugarProducts * (prefs.reduceSugar || hasGoal(prefs, "reduce_sugar") ? 7 : 4));
  if (highSaltProducts) global -= Math.min(12, highSaltProducts * (prefs.reduceSalt || hasGoal(prefs, "reduce_salt") ? 6 : 3));
  if (manyAdditivesProducts) global -= Math.min(14, manyAdditivesProducts * (prefs.reduceAdditives || hasGoal(prefs, "reduce_additives") ? 6 : 3));
  if (missingCriticalData) global -= Math.min(16, missingCriticalData * 5);
  if (lowScoreProducts) global -= Math.min(12, lowScoreProducts * 4);
  if (compatibility.vegan.active && compatibility.vegan.incompatible) global -= Math.min(20, compatibility.vegan.incompatible * 8);
  if (compatibility.vegetarian.active && compatibility.vegetarian.incompatible) global -= Math.min(16, compatibility.vegetarian.incompatible * 6);
  if (compatibility.bio.active && compatibility.bio.ratio >= 0.6) global += 4;
  if (compatibility.halal.active && compatibility.halal.ratio >= 0.6 && compatibility.halal.incompatible === 0) global += 3;
  if (ratio(excellentProducts, productCount) >= 0.5) global += 5;
  if (ratio(distributions.nova["1"] + distributions.nova["2"], productCount) >= 0.6) global += 4;
  if (nutritionBalance.protein.preferenceActive && nutritionBalance.protein.status === "good") global += 3;
  if (nutritionBalance.fiber.preferenceActive && nutritionBalance.fiber.status === "good") global += 3;

  addWarning("allergenConflicts", allergenConflicts, "critical");
  addWarning("nova4", nova4Products);
  addWarning("highSugar", highSugarProducts);
  addWarning("highSalt", highSaltProducts);
  addWarning("manyAdditives", manyAdditivesProducts);
  addWarning("missingData", missingCriticalData);
  if (compatibility.halal.active && compatibility.halal.unknown) addWarning("halalUnknown", compatibility.halal.unknown, "info");
  if (compatibility.bio.active && compatibility.bio.ratio < 0.5) addWarning("bioLow", productCount - compatibility.bio.compatible, "info");

  const confidenceScore = clamp(
    100 -
      missingCriticalData * 18 -
      analyses.filter((analysis) => analysis.gree.confidenceLevel === "low").length * 12 -
      analyses.filter((analysis) => analysis.gree.confidenceLevel === "medium").length * 5 -
      distributions.nova.unknown * 4
  );
  const hasCriticalIssue = analyses.some((analysis) => analysis.issues.some((issue) => issue.severity === "critical"));
  const roundedGlobal = clamp(round(global), hasCriticalIssue ? 0 : 10);
  const { grade, labelKey } = gradeForBasket(roundedGlobal);
  const mainRisk = chooseMainRisk(metrics);
  const mainStrength = chooseMainStrength(analyses, metrics, compatibility, nutritionBalance, prefs);

  const positiveInsights: BasketMessage[] = [];
  if (excellentProducts > 0) positiveInsights.push(message("excellentProducts", { count: excellentProducts }));
  if (distributions.nova["1"] + distributions.nova["2"] > 0) {
    positiveInsights.push(message("lowProcessed", { count: distributions.nova["1"] + distributions.nova["2"] }));
  }
  if (compatibility.bio.active && compatibility.bio.ratio >= 0.5) positiveInsights.push(message("bioMatch", { percent: round(compatibility.bio.ratio * 100) }));
  if (compatibility.halal.active && compatibility.halal.ratio >= 0.5) {
    positiveInsights.push(message("halalMatch", { percent: round(compatibility.halal.ratio * 100) }));
  }
  if (nutritionBalance.protein.preferenceActive && nutritionBalance.protein.status === "good") positiveInsights.push(message("protein"));
  if (nutritionBalance.fiber.preferenceActive && nutritionBalance.fiber.status === "good") positiveInsights.push(message("fiber"));
  if (!positiveInsights.length) positiveInsights.push(message("balancedBasics"));

  const productsDraggingScore = [...analyses]
    .filter((analysis) => analysis.effectiveScore < 68 || analysis.issues.some((issue) => issue.severity !== "info"))
    .sort((a, b) => b.dragPenalty + (100 - b.effectiveScore) - (a.dragPenalty + (100 - a.effectiveScore)));
  const productsImprovingBasket = [...analyses]
    .filter((analysis) => analysis.effectiveScore >= 70 && analysis.issues.every((issue) => issue.severity === "info"))
    .sort((a, b) => b.effectiveScore - a.effectiveScore);

  return {
    global: roundedGlobal,
    grade,
    labelKey,
    confidenceLevel: confidenceLevel(confidenceScore),
    confidenceScore,
    verdict: chooseVerdict(roundedGlobal, metrics, prefs),
    positiveInsights: positiveInsights.slice(0, 4),
    warnings,
    mainRisk,
    mainStrength,
    productsDraggingScore,
    productsImprovingBasket,
    recommendedReplacements: productsDraggingScore.slice(0, 3),
    analyses,
    metrics,
    distributions,
    compatibility,
    nutritionBalance
  };
}
