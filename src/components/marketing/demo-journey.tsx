"use client";
/**
 * Interactive scan→decision demo — the only client island of the marketing
 * home. Plain useState + CSS (no framer) to keep the page lightweight.
 * All figures are computed server-side by the real engines and passed in.
 */
import { useState } from "react";
import { ScanLine, ShieldCheck, ArrowRight, Leaf } from "lucide-react";
import { GreeBadge } from "@/components/system/gree-badge";
import { StaticScoreRing } from "./static-ring";
import { cn } from "@/lib/utils/cn";

export interface DemoData {
  genericScore: number;
  genericGrade: string;
  betterScore: number;
  betterGrade: string;
  gain: number;
  labels: {
    steps: { title: string; body: string }[];
    scanning: string;
    productGeneric: string;
    productBetter: string;
    reasonSugar: string;
    reasonNova: string;
    reasonBio: string;
    reasonFiber: string;
    trust: string;
    swapGain: string;
    before: string;
    after: string;
  };
}

export function DemoJourney({ data }: { data: DemoData }) {
  const [step, setStep] = useState(0);
  const L = data.labels;

  return (
    <div className="mx-auto max-w-lg">
      {/* step tabs */}
      <div role="tablist" aria-label={L.steps.map((s) => s.title).join(" · ")} className="mb-4 grid grid-cols-3 gap-2">
        {L.steps.map((s, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={step === i}
            onClick={() => setStep(i)}
            className={cn(
              "gc-pressable rounded-2xl border px-2 py-2.5 text-xs font-semibold transition-colors duration-fast ease-out",
              step === i ? "border-transparent bg-deep text-white shadow-soft" : "border-line bg-surface text-muted"
            )}
          >
            <span className="me-1 tabular-nums">{i + 1}.</span>
            {s.title}
          </button>
        ))}
      </div>

      {/* stage */}
      <div className="gc-card relative min-h-[300px] overflow-hidden p-5">
        {step === 0 && (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 text-center">
            {/* phone-ish scan frame; neon = active scanning motion */}
            <div className="relative grid h-44 w-32 place-items-center overflow-hidden rounded-2xl bg-deep-grad">
              <span aria-hidden className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse rounded-full bg-neon shadow-glow" />
              <span aria-hidden className="absolute inset-4 rounded-xl border-2 border-white/25" />
              <ScanLine className="h-8 w-8 text-white/80" aria-hidden />
            </div>
            <p className="text-sm font-medium text-muted">{L.scanning}</p>
          </div>
        )}

        {step === 1 && (
          <div className="flex min-h-[260px] flex-col justify-center gap-4">
            <div className="flex items-center gap-4">
              <StaticScoreRing value={data.genericScore} size={92} label={data.genericGrade} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{L.productGeneric}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <GreeBadge tone="caution" size="sm">– {L.reasonSugar}</GreeBadge>
                  <GreeBadge tone="caution" size="sm">– {L.reasonNova}</GreeBadge>
                </div>
              </div>
            </div>
            <p className="inline-flex items-center gap-1.5 self-start rounded-full border border-natural/30 bg-natural/10 px-2.5 py-1 text-xs font-semibold text-natural-strong">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {L.trust}
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="flex min-h-[260px] flex-col justify-center gap-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="rounded-2xl bg-surface-2 p-3 text-center">
                <p className="gc-overline">{L.before}</p>
                <StaticScoreRing value={data.genericScore} size={72} />
                <p className="mt-1 line-clamp-2 text-xs font-medium">{L.productGeneric}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-natural-strong rtl:rotate-180" aria-hidden />
              <div className="rounded-2xl border border-natural/30 bg-natural/5 p-3 text-center">
                <p className="gc-overline">{L.after}</p>
                <StaticScoreRing value={data.betterScore} size={72} />
                <p className="mt-1 line-clamp-2 text-xs font-medium">{L.productBetter}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <GreeBadge tone="positive" size="sm">{L.swapGain}</GreeBadge>
              <GreeBadge tone="brand" size="sm"><Leaf className="h-3 w-3" aria-hidden /> {L.reasonBio}</GreeBadge>
              <GreeBadge tone="brand" size="sm">+ {L.reasonFiber}</GreeBadge>
            </div>
          </div>
        )}
      </div>

      {/* step captions */}
      <p className="mt-3 text-center text-sm text-muted">{L.steps[step].body}</p>
    </div>
  );
}
