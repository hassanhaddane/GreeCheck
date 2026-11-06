"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { GreeButton } from "@/components/system/gree-button";
import { GreeBottomSheet } from "@/components/system/gree-bottom-sheet";

export function FirstScanIntro({ onDone }: { onDone: () => void }) {
  const t = useTranslations("scan.intro");
  const [step, setStep] = useState(0);
  const titles = [t("step1Title"), t("step2Title"), t("step3Title")];
  const bodies = [t("step1Body"), t("step2Body"), t("step3Body")];
  const last = step === titles.length - 1;

  return (
    <GreeBottomSheet open onClose={onDone} title={t("title")} closeLabel={t("dismiss")}>
      <div className="space-y-3" aria-live="polite">
        <p className="text-xs font-semibold text-muted">{t("stepLabel", { n: step + 1 })}</p>
        <h3 className="gc-heading">{titles[step]}</h3>
        <p className="text-sm leading-relaxed text-muted">{bodies[step]}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <GreeButton variant="ghost" onClick={onDone}>{t("dismiss")}</GreeButton>
          <GreeButton onClick={() => last ? onDone() : setStep(step + 1)}>{last ? t("done") : t("next")}</GreeButton>
        </div>
      </div>
    </GreeBottomSheet>
  );
}
