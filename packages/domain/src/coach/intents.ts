/**
 * Deterministic intent classification for GreeCoach free-text input.
 *
 * No NLP model: a small, multilingual (fr/en/ar) keyword matcher maps a typed
 * question to one of the supported intents, or null (→ the UI shows the
 * supported questions). The primary interaction is tappable suggestion chips;
 * this classifier is a convenience for typed questions only.
 */
import type { CoachContext, CoachIntent } from "./types";

/** Which intents make sense for a given context (drive the suggestion chips). */
export function supportedIntents(ctx: CoachContext): CoachIntent[] {
  if (ctx.kind === "compare") return ["compareHealth", "compareEnvironment"];
  if (ctx.kind === "cart") return ["improveCart"];
  // product
  const base: CoachIntent[] = ctx.gree.status === "unscored"
    ? ["whyNoScore", "halalConfirmed", "allergenCheck", "explainSimpler"]
    : ["whyRated", "mainWeakness", "mainStrength", "whichAdditive", "halalConfirmed", "allergenCheck", "explainSimpler"];
  if (ctx.alternative) base.splice(1, 0, "whyAlternativeBetter");
  return base;
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Ordered rules: first matching group wins (specific before generic). */
const RULES: Array<{ intent: CoachIntent; any: string[]; all?: string[] }> = [
  { intent: "whyNoScore", any: ["pas de note", "pas de score", "aucune note", "aucun score", "no score", "not rated", "not scored", "لا نتيجة", "لماذا لا"] },
  { intent: "whichAdditive", any: ["additif", "additive", "e number", "e-number", "مضاف"] },
  { intent: "whyAlternativeBetter", any: ["alternative", "meilleure option", "why is the alternative", "pourquoi l'alternative", "البديل"] },
  { intent: "compareHealth", any: ["meilleur pour la sante", "better for health", "healthier", "plus sain", "الأفضل صحيا", "afdal sihi"] },
  { intent: "compareEnvironment", any: ["environnement", "environment", "planete", "planet", "impact ecolo", "البيئة"] },
  { intent: "improveCart", any: ["ameliorer", "improve", "greecart", "mon panier", "basket", "السلة", "تحسين"] },
  { intent: "halalConfirmed", any: ["halal", "حلال"] },
  { intent: "allergenCheck", any: ["allergen", "allergene", "allergie", "allergy", "مسبب", "حساسية"] },
  { intent: "mainWeakness", any: ["faiblesse", "point faible", "weakness", "worst", "le pire", "le plus mauvais", "الأضعف", "نقطة ضعف"] },
  { intent: "mainStrength", any: ["force", "point fort", "strength", "best point", "atout", "الأقوى", "نقطة قوة"] },
  { intent: "explainSimpler", any: ["simple", "simplement", "explain simply", "plus clair", "clairement", "ببساطة", "بكلمات"] },
  { intent: "whyRated", any: ["pourquoi", "why", "comment", "how come", "explique", "explain", "لماذا", "كيف"] }
];

/**
 * Classify a typed question to a supported intent, constrained to what the
 * current context can answer. Returns null when nothing matches — the UI then
 * invites the user to pick a supported question (never fabricates an answer).
 */
export function classifyIntent(text: string, ctx: CoachContext): CoachIntent | null {
  const s = norm(text);
  if (!s.trim()) return null;
  const allowed = new Set(supportedIntents(ctx));
  for (const rule of RULES) {
    if (!allowed.has(rule.intent)) continue;
    const hit = rule.any.some((k) => s.includes(norm(k))) && (!rule.all || rule.all.every((k) => s.includes(norm(k))));
    if (hit) return rule.intent;
  }
  return null;
}
