import type { Product } from "@greecheck/domain/product/model";
import { gtinIdentity } from "@greecheck/domain/product/gtin";
import { computeDataQuality } from "@greecheck/domain/product/normalizer";
import { computeGreeImpact } from "@greecheck/domain/impact/engine";
import type { GreeScore } from "@greecheck/domain/scoring/types";
import type { LocalPreferences } from "@greecheck/domain/criteria/model";
import { normalize } from "@/domains/search/intents";
import { normalizeBarcodeInput } from "@/lib/utils/parse-scan";

export interface ScoredProduct {
  p: Product;
  gree: GreeScore;
}

const families = [
  ["yaourt", "yaourts", "yogurt", "yogurts", "yoghurt", "yoghurts", "yoghourt", "زبادي", "ياغورت"],
  ["avoine", "oat", "oats", "شوفان"],
  ["pois chiches", "chickpea", "chickpeas", "garbanzo", "garbanzos", "حمص"],
  ["aubergine", "aubergines", "eggplant", "eggplants", "باذنجان"]
];

function tokens(text: string): string[] {
  const words = normalize(text).replace(/[ـ\u064b-\u065f]/g, "").replace(/[أإآ]/g, "ا")
    .match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.filter((word) => word.length > 1);
}

/** Rewrite a few spelling variants using the active locale and the same single search request. */
export function searchProviderTerm(term: string, locale: LocalPreferences["language"]): string {
  const value = tokens(term).join(" ");
  if (locale === "fr" && ["yogurt", "yoghurt", "yoghourt"].includes(value)) return "yaourt";
  if (locale === "en" && ["yoghurt", "yoghourt"].includes(value)) return "yogurt";
  if (locale === "ar" && value === "ياغورت") return "زبادي";
  return term;
}

function concepts(text: string): string[] {
  const words = tokens(text.replace(/(?:^|\s)[a-z]{2,3}:/g, " ")).join(" ").replace(/\bpois chiches\b/g, "chickpeas");
  return words.split(" ").filter(Boolean).map((word) => families.find((group) => group.includes(word))?.[0] ?? word);
}

/** At most one insertion, deletion, replacement or adjacent transposition. */
function near(a: string, b: string) {
  if (Math.min(a.length, b.length) < 4 || Math.abs(a.length - b.length) > 1) return false;
  const index = [...a].findIndex((letter, i) => letter !== b[i]);
  if (index < 0) return true;
  if (a.length < b.length) return a.slice(index) === b.slice(index + 1);
  if (a.length > b.length) return a.slice(index + 1) === b.slice(index);
  return a.slice(index + 1) === b.slice(index + 1) ||
    (a[index] === b[index + 1] && a[index + 1] === b[index] && a.slice(index + 2) === b.slice(index + 2));
}

function coverage(query: string[], words: string[]) {
  return query.reduce((sum, word) => sum + Math.max(0, ...words.map((candidate) => {
    if (candidate === word) return 1;
    if (word.length >= 3 && candidate.startsWith(word)) return 0.65;
    return near(word, candidate) ? 0.5 : 0;
  })), 0) / query.length;
}

export function relevanceScore(query: string, p: Product): number {
  const wanted = concepts(query);
  if (!wanted.length) return 0;
  const name = [p.name, ...Object.values(p.localizedNames ?? {}), p.brand ?? ""].join(" ");
  const categories = [...(p.categories ?? []), ...(p.categoryIds ?? [])].join(" ");
  return Math.max(coverage(wanted, concepts(name)), 0.85 * coverage(wanted, concepts(name + " " + categories)));
}

function identityMatch(query: string, p: Product) {
  const identity = gtinIdentity(normalizeBarcodeInput(query));
  if (identity && gtinIdentity(p.barcode) === identity) return 2;
  const text = tokens(query).join(" ");
  const names = [p.name, ...Object.values(p.localizedNames ?? {}), p.brand ?? ""];
  return text && names.some((name) => tokens(name).join(" ") === text) ? 1 : 0;
}

function criteriaBoost(p: Product, prefs: LocalPreferences): number {
  let n = 0;
  if ((prefs.preferBio || prefs.goals.includes("go_organic")) && p.isBio) n += 1;
  if ((prefs.preferHalal || prefs.goals.includes("halal")) && p.isHalal) n += 1;
  if ((prefs.preferVegan || prefs.goals.includes("vegan")) && p.isVegan) n += 1;
  if ((prefs.preferVegetarian || prefs.goals.includes("vegetarian")) && p.isVegetarian) n += 1;
  if ((prefs.reduceUltraProcessed || prefs.goals.includes("avoid_ultraprocessed")) && (p.novaGroup ?? 4) <= 2) n += 1;
  const impact = prefs.preferEnvironment ? computeGreeImpact(p) : undefined;
  if (impact?.status === "valid" && (impact.grade === "a" || impact.grade === "b")) n += 1;
  return n;
}


/** Identity, relevance, documented facts, preferences, then the displayed GS-3 score. */
export function rankSearchResults(query: string, scored: ScoredProduct[], prefs: LocalPreferences): ScoredProduct[] {
  const confidence = { high: 2, medium: 1, low: 0 };
  return scored.map((entry) => ({
    entry,
    identity: identityMatch(query, entry.p),
    relevance: relevanceScore(query, entry.p),
    scored: Number(entry.gree.status === "scored"),
    confidence: confidence[entry.gree.confidence],
    criteria: criteriaBoost(entry.p, prefs),
    completeness: (entry.p.dataQuality ?? computeDataQuality(entry.p)).completeness,
    score: entry.gree.score ?? -1
  })).sort((a, b) =>
    b.identity - a.identity || b.relevance - a.relevance || b.scored - a.scored ||
    b.confidence - a.confidence || b.criteria - a.criteria || b.completeness - a.completeness ||
    b.score - a.score || a.entry.p.barcode.localeCompare(b.entry.p.barcode)
  ).map(({ entry }) => entry);
}
