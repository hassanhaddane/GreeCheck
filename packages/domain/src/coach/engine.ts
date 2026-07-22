/**
 * GreeCoach V1 answer engine — pure, deterministic template assembly.
 *
 * Every answer is built ONLY from verified engine outputs already in the
 * context. No facts are invented, no medical claims are made, uncertainty is
 * stated explicitly, and each answer points at the relevant methodology
 * section. Same input → same answer.
 */
import { halalStatusOf } from "../scoring/detectors";
import type {
  CoachAnswer, CoachContext, CoachIntent, CoachLine, ProductContext,
  CompareContext, CartContext, MethodologyAnchor
} from "./types";
import { GREE_COACH_VERSION } from "./types";

const line = (code: string, params?: CoachLine["params"], ref?: CoachLine["ref"]): CoachLine => ({ code, params, ref });

function build(intent: CoachIntent, lines: CoachLine[], opts: { uncertainty?: CoachLine; methodology?: MethodologyAnchor; unsupported?: boolean } = {}): CoachAnswer {
  return { intent, version: GREE_COACH_VERSION, lines, ...opts };
}

const unsupported = (intent: CoachIntent): CoachAnswer =>
  build(intent, [line("unsupported")], { unsupported: true });

/* ── product intents ── */

function productAnswer(intent: CoachIntent, ctx: ProductContext): CoachAnswer {
  const { gree, product, prefs } = ctx;
  const scored = gree.status === "scored";

  switch (intent) {
    case "whyRated": {
      if (!scored) return whyNoScore(ctx);
      const lines: CoachLine[] = [
        line("verdictIs", { score: gree.global }, { ns: "verdict", code: gree.verdict })
      ];
      const reasons = [...gree.topNegatives, ...gree.topPositives].slice(0, 3);
      for (const r of reasons) {
        lines.push(line(r.kind === "malus" ? "reasonMinus" : "reasonPlus", undefined, { ns: "reason", code: r.code, values: r.values }));
      }
      if (gree.components) {
        const c = gree.components;
        lines.push(line("componentBreakdown", {
          nutrition: c.nutrition.contribution, additives: c.additives.contribution, organic: c.organic.contribution
        }));
      }
      if (gree.cappedByHighRiskAdditive) lines.push(line("cappedByAdditive"));
      const unc = gree.confidence !== "high" ? line("confidencePartial", undefined, undefined) : undefined;
      return build(intent, lines, { methodology: "score", uncertainty: unc });
    }

    case "mainWeakness": {
      const w = gree.topNegatives[0];
      if (!w) return build(intent, [line("noWeakness")], { methodology: "score" });
      return build(intent, [line("weaknessIs", undefined, { ns: "reason", code: w.code, values: w.values })], { methodology: "score" });
    }

    case "mainStrength": {
      const s = gree.topPositives[0];
      if (!s) return build(intent, [line("noStrength")], { methodology: "score" });
      return build(intent, [line("strengthIs", undefined, { ns: "reason", code: s.code, values: s.values })], { methodology: "score" });
    }

    case "whichAdditive": {
      if (!scored || !gree.components) {
        return build(intent, [line("additivesUnknown")], { methodology: "additives", uncertainty: line("ingredientsUnavailable") });
      }
      const impactful = gree.components.additives.deductions.filter((d) => d.deduction > 0 || d.triggersCap);
      if (!impactful.length) return build(intent, [line("noAdditiveImpact")], { methodology: "additives" });
      const lines = impactful.map((d) =>
        line(d.triggersCap ? "additiveCapped" : "additivePenalty", { code: d.code.toUpperCase(), points: d.deduction })
      );
      return build(intent, lines, { methodology: "additives" });
    }

    case "whyNoScore":
      return whyNoScore(ctx);

    case "halalConfirmed": {
      const st = halalStatusOf(product);
      if (st === "confirmed") return build(intent, [line("halalConfirmed")], { methodology: "halal" });
      if (st === "incompatible") return build(intent, [line("halalIncompatible")], { methodology: "halal" });
      if (st === "check_required") return build(intent, [line("halalCheck")], { methodology: "halal", uncertainty: line("halalUncertain") });
      // not_confirmed | unknown → "not verified" (absence is NEVER "not halal")
      return build(intent, [line("halalNotVerified")], { methodology: "halal", uncertainty: line("halalUncertain") });
    }

    case "allergenCheck": {
      const avoid = prefs.avoidAllergens.map((a) => a.trim().toLowerCase()).filter(Boolean);
      if (!avoid.length) return build(intent, [line("noAllergenDeclared")]);
      const known = Boolean(product.ingredientsText || product.allergens?.length);
      const hay = [product.ingredientsText ?? "", ...(product.allergens ?? []), ...(product.traces ?? [])].join(" ").toLowerCase();
      const hits = avoid.filter((a) => hay.includes(a));
      if (hits.length) return build(intent, [line("allergenFound", { allergens: hits.join(", ") })]);
      if (!known) return build(intent, [line("allergenCannotConfirm")], { uncertainty: line("ingredientsUnavailable") });
      return build(intent, [line("allergenNoneFound", { allergens: avoid.join(", ") })]);
    }

    case "whyAlternativeBetter": {
      if (!ctx.alternative) return build(intent, [line("noAlternative")], { methodology: "score", uncertainty: line("noAlternative") });
      const a = ctx.alternative;
      const lines: CoachLine[] = [line("alternativeScore", { from: gree.global, to: a.gree.global, gain: Math.max(0, a.gree.global - gree.global) })];
      const wn = product.nutriments, an = a.product.nutriments;
      const less = (x?: number, y?: number) => x !== undefined && y !== undefined && y < x - 0.01;
      if (less(wn.sugars, an.sugars)) lines.push(line("altLessSugar", { v: Math.round((wn.sugars! - an.sugars!) * 10) / 10 }));
      if ((a.product.additives?.length ?? 0) < (product.additives?.length ?? 0)) lines.push(line("altFewerAdditives"));
      if ((a.product.novaGroup ?? 9) < (product.novaGroup ?? 9)) lines.push(line("altLessProcessed"));
      return build(intent, lines, { methodology: "score" });
    }

    case "explainSimpler": {
      if (!scored) {
        const anc = whyNoScore(ctx);
        return build(intent, [line("simpleNoScore"), ...anc.lines], { methodology: "score" });
      }
      const lines: CoachLine[] = [line("simpleVerdict", { score: gree.global }, { ns: "verdict", code: gree.verdict })];
      const top = gree.topNegatives[0] ?? gree.topPositives[0];
      if (top) lines.push(line("simpleReason", undefined, { ns: "reason", code: top.code, values: top.values }));
      if (gree.confidence !== "high") lines.push(line("simpleConfidence"));
      lines.push(line("notMedical"));
      return build(intent, lines, { methodology: "score" });
    }

    default:
      return unsupported(intent);
  }
}

function whyNoScore(ctx: ProductContext): CoachAnswer {
  const { gree } = ctx;
  if (gree.status === "scored") {
    return build("whyNoScore", [line("actuallyScored", { score: gree.global }, { ns: "grade", code: gree.grade })], { methodology: "score" });
  }
  const code = gree.unscored?.code ?? "insufficient_data";
  return build("whyNoScore", [line("noScoreBecause", undefined, { ns: "unscored", code })], { methodology: "score", uncertainty: line("noScoreUncertain") });
}

/* ── compare intents ── */

function compareAnswer(intent: CoachIntent, ctx: CompareContext): CoachAnswer {
  const r = ctx.result;
  if (intent === "compareHealth") {
    if (!r.validation.comparable || !r.healthWinner) return build(intent, [line("notComparable")], { methodology: "compare", uncertainty: line("notComparable") });
    const lines: CoachLine[] = [line("healthWinnerIs", { name: r.healthWinner.product.name, score: r.healthWinner.gree.global })];
    for (const code of r.healthReasons.slice(0, 3)) lines.push(line("healthReason", undefined, { ns: "reason", code }));
    const unc = r.healthWinnerLowConfidence ? line("winnerLowConfidence") : undefined;
    return build(intent, lines, { methodology: "score", uncertainty: unc });
  }
  if (intent === "compareEnvironment") {
    if (!r.environmentWinner) return build(intent, [line("noEnvComparison")], { methodology: "impact", uncertainty: line("noEnvComparison") });
    const lines: CoachLine[] = [line("envWinnerIs", { name: r.environmentWinner.product.name, grade: r.environmentWinner.impact.grade!.toUpperCase() })];
    for (const code of r.environmentReasons.slice(0, 3)) lines.push(line("envReasonLine", undefined, { ns: "envReason", code }));
    return build(intent, lines, { methodology: "impact" });
  }
  return unsupported(intent);
}

/* ── cart intents ── */

function cartAnswer(intent: CoachIntent, ctx: CartContext): CoachAnswer {
  if (intent !== "improveCart") return unsupported(intent);
  const { result, extras } = ctx;
  if (!result.metrics.productCount) return build(intent, [line("cartEmpty")], { methodology: "cart" });

  const lines: CoachLine[] = [line("cartScoreIs", { score: result.global })];
  if (result.mainRisk.key !== "none") lines.push(line("cartMainRisk", result.mainRisk.values, { ns: "cartRisk", code: result.mainRisk.key }));

  const priority = result.recommendedReplacements[0];
  if (priority) lines.push(line("cartReplaceFirst", { name: priority.product.name }));
  if (extras.allergenAlerts.length) lines.push(line("cartAllergenAlert", { n: extras.allergenAlerts.length }));
  if (extras.ultraProcessedCount) lines.push(line("cartUltraProcessed", { n: extras.ultraProcessedCount }));
  if (!priority && result.global >= 70) lines.push(line("cartAlreadyGood"));

  const unc = result.metrics.missingCriticalData ? line("cartPartialData", { n: result.metrics.missingCriticalData }) : undefined;
  return build(intent, lines, { methodology: "cart", uncertainty: unc });
}

/* ── entry point ── */

export function answerCoach(intent: CoachIntent, ctx: CoachContext): CoachAnswer {
  if (ctx.kind === "product") return productAnswer(intent, ctx);
  if (ctx.kind === "compare") return compareAnswer(intent, ctx);
  if (ctx.kind === "cart") return cartAnswer(intent, ctx);
  return unsupported(intent);
}
