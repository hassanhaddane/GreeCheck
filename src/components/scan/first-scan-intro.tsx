"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Gauge, Repeat2, ShieldCheck, X } from "lucide-react";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { GreeButton } from "@/components/system/gree-button";
import { GreePulse } from "@/components/system/gree-pulse";

interface FirstScanIntroProps {
  /** Called when the intro is dismissed or completed (persists "seen"). */
  onDone: () => void;
}

const STEP_ICONS = [Gauge, Repeat2, ShieldCheck] as const;

/**
 * FirstScanIntro — the once-only, NON-BLOCKING onboarding shown AFTER the
 * first successful scan (never before first use, per the V2 rule). Three short
 * steps — GreeScore, GreeSwap, on-device privacy — that the user can dismiss
 * immediately. It renders inline (the rapid actions stay fully usable) and is
 * marked seen on dismiss so it appears exactly once.
 */
export function FirstScanIntro({ onDone }: FirstScanIntroProps) {
  const t = useTranslations("scan");
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const total = 3;

  const titles = [t("intro.step1Title"), t("intro.step2Title"), t("intro.step3Title")];
  const bodies = [t("intro.step1Body"), t("intro.step2Body"), t("intro.step3Body")];
  const Icon = STEP_ICONS[step];
  const last = step === total - 1;

  const next = () => (last ? onDone() : setStep((s) => Math.min(total - 1, s + 1)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.3 }}
      role="dialog"
      aria-label={t("intro.title")}
      aria-live="polite"
    >
      <GreeCard variant="deep" glow className="relative overflow-hidden">
        <GreeCardContent className="space-y-4 py-5">
          <button
            type="button"
            onClick={onDone}
            aria-label={t("intro.dismiss")}
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/60"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>

          <div className="flex items-center gap-3">
            <GreePulse size={40} state="success" />
            <div>
              <p className="gc-overline text-neon">{t("intro.title")}</p>
              <p className="text-xs font-medium text-white/60">{t("intro.stepLabel", { n: step + 1 })}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: reduce ? 0 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduce ? 0 : -12 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              className="flex items-start gap-3"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-neon" aria-hidden>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-white">{titles[step]}</p>
                <p className="text-sm leading-relaxed text-white/75">{bodies[step]}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5" aria-hidden>
              {Array.from({ length: total }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-neon" : "w-1.5 bg-white/25"}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDone}
                className="rounded-xl px-2 py-1 text-sm font-medium text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/60"
              >
                {t("intro.dismiss")}
              </button>
              <GreeButton variant="neon" size="sm" onClick={next}>
                {last ? t("intro.done") : t("intro.next")}
              </GreeButton>
            </div>
          </div>
        </GreeCardContent>
      </GreeCard>
    </motion.div>
  );
}
