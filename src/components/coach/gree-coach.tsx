"use client";
/**
 * GreeCoach V1 — a deterministic informational assistant.
 *
 * It LOOKS conversational (a sheet with a question box and turn bubbles) but
 * every answer comes from the pure domain engine assembling verified facts.
 * There is NO LLM, NO network, and NO persistence: the turn list lives in
 * component state only and is discarded when the sheet closes/unmounts.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Send, BookOpenText, Info, ShieldQuestion } from "lucide-react";
import { Link } from "@/i18n/routing";
import { GreeBottomSheet } from "@/components/system/gree-bottom-sheet";
import { answerCoach } from "@greecheck/domain/coach/engine";
import { classifyIntent, supportedIntents } from "@greecheck/domain/coach/intents";
import type { CoachContext, CoachIntent, CoachAnswer, CoachLine, MethodologyAnchor } from "@greecheck/domain/coach/types";
import { cn } from "@/lib/utils/cn";

interface Turn { question: string; answer: CoachAnswer }

const METHOD_ANCHOR: Record<MethodologyAnchor, string> = {
  score: "greescore", nutrition: "nutrition", additives: "additives", organic: "organic",
  impact: "greeimpact", confidence: "confidence", halal: "halal", compare: "greescore", cart: "greescore"
};

export function GreeCoach({ open, onClose, context }: { open: boolean; onClose: () => void; context: CoachContext }) {
  const t = useTranslations("coach");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");

  const intents = supportedIntents(context);

  const ask = (intent: CoachIntent, questionLabel: string) => {
    setTurns((prev) => [...prev, { question: questionLabel, answer: answerCoach(intent, context) }]);
    setDraft("");
  };

  const submitFreeText = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const intent = classifyIntent(text, context);
    if (intent) {
      setTurns((prev) => [...prev, { question: text, answer: answerCoach(intent, context) }]);
    } else {
      setTurns((prev) => [...prev, { question: text, answer: { intent: "whyRated", version: "GC-1.0.0", lines: [{ code: "unsupported" }], unsupported: true } }]);
    }
    setDraft("");
  };

  return (
    <GreeBottomSheet open={open} onClose={onClose} title={t("title")} closeLabel={t("close")}>
      {/* deterministic-assistant disclosure */}
      <p className="mb-3 flex items-start gap-1.5 rounded-2xl bg-pastel-stone px-3 py-2.5 text-xs text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-natural-strong" aria-hidden />
        {t("disclosure")}
      </p>

      {/* conversation (session-only, never saved) */}
      {turns.length > 0 && (
        <div className="mb-3 space-y-3">
          {turns.map((turn, i) => (
            <div key={i} className="space-y-1.5">
              <p className="ms-auto w-fit max-w-[85%] rounded-2xl rounded-ee-md bg-natural/12 px-3 py-2 text-sm font-medium text-natural-strong">{turn.question}</p>
              <CoachBubble answer={turn.answer} />
            </div>
          ))}
        </div>
      )}

      {/* suggested questions (the guaranteed-deterministic path) */}
      <p className="gc-overline mb-1.5">{turns.length ? t("askMore") : t("suggested")}</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {intents.map((intent) => (
          <button
            key={intent}
            onClick={() => ask(intent, t(`q.${intent}`))}
            className="gc-pressable rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
          >
            {t(`q.${intent}`)}
          </button>
        ))}
      </div>

      {/* free-text (routed through the deterministic classifier) */}
      <form onSubmit={submitFreeText} className="flex gap-2">
        <label htmlFor="coach-input" className="sr-only">{t("inputLabel")}</label>
        <input
          id="coach-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("inputPlaceholder")}
          className="h-11 min-w-0 flex-1 rounded-2xl border border-line bg-surface-2 px-4 text-sm outline-none focus:ring-2 focus:ring-natural-strong/50"
        />
        <button type="submit" disabled={!draft.trim()} aria-label={t("send")}
          className="gc-pressable grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-natural-grad text-white disabled:opacity-40">
          <Send className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </button>
      </form>
      <p className="mt-2 text-[0.7rem] text-muted">{t("noHistory")}</p>
    </GreeBottomSheet>
  );
}

/* one answer bubble — resolves referenced engine codes into the coach sentence */
function CoachBubble({ answer }: { answer: CoachAnswer }) {
  const t = useTranslations("coach");
  const tScore = useTranslations("score");
  const tCompare = useTranslations("compare");
  const tImpact = useTranslations("impact");
  const tCart = useTranslations("cart");

  const resolveRef = (ref: NonNullable<CoachLine["ref"]>): string => {
    switch (ref.ns) {
      case "reason": return tScore(`reason.${ref.code}`, ref.values);
      case "verdict": return tScore(`verdict.${ref.code}`);
      case "warning": return tScore(`warning.${ref.code}`, ref.values);
      case "unscored": return tScore(`unscored.${ref.code}`, ref.values);
      case "grade": return tScore(`grade.${ref.code}`);
      case "impactLabel": return tImpact(ref.code);
      case "envReason": return tCompare(`envReason.${ref.code}`);
      case "cartRisk": return tCart(`risk.${ref.code}`, ref.values);
      default: return "";
    }
  };

  const render = (l: CoachLine) => t(`line.${l.code}`, { ...(l.params ?? {}), ...(l.ref ? { ref: resolveRef(l.ref) } : {}) });

  return (
    <div className="w-fit max-w-[92%] space-y-1.5 rounded-2xl rounded-es-md bg-surface-2 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-natural-strong">
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> GreeCoach
      </div>
      {answer.lines.map((l, i) => (
        <p key={i} className={cn("text-sm leading-relaxed", l.code === "unsupported" && "text-muted")}>{render(l)}</p>
      ))}
      {answer.uncertainty && (
        <p className="flex items-start gap-1.5 text-xs text-score-c-ink">
          <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {render(answer.uncertainty)}
        </p>
      )}
      {answer.methodology && (
        <Link
          href={`/methodology#${METHOD_ANCHOR[answer.methodology]}`}
          className="gc-pressable inline-flex items-center gap-1 pt-0.5 text-xs font-semibold text-natural-strong"
        >
          <BookOpenText className="h-3.5 w-3.5" aria-hidden /> {t("methodologyLink")}
        </Link>
      )}
    </div>
  );
}

/** Compact launcher button that opens the GreeCoach sheet. */
export function GreeCoachButton({ context, className }: { context: CoachContext; className?: string }) {
  const t = useTranslations("coach");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn("gc-pressable inline-flex items-center gap-2 rounded-2xl border border-natural/30 bg-natural/5 px-4 py-2.5 text-sm font-semibold text-natural-strong", className)}
      >
        <Sparkles className="h-4 w-4" aria-hidden /> {t("askCoach")}
      </button>
      <GreeCoach open={open} onClose={() => setOpen(false)} context={context} />
    </>
  );
}
