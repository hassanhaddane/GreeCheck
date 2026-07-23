"use client";
/**
 * OCR beta — isolated experimental flow (ingredient list & nutrition table
 * photographs). Rendered ONLY when OCR_BETA_ENABLED and kept entirely separate
 * from the stable barcode scanner: its own reducer, its own image lifecycle.
 *
 * Guarantees enforced here:
 *  - the image is a session-only object URL, revoked on reset/unmount, never
 *    persisted and never uploaded (extraction runs in-browser);
 *  - nothing is confirmed without an explicit user action;
 *  - a score is shown only when every required field is confirmed, otherwise
 *    the missing fields are named;
 *  - every result is labeled "user-confirmed extracted data".
 */
import { useEffect, useReducer, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Camera, Upload, RotateCw, RotateCcw, Check, X, FlaskConical,
  AlertTriangle, Loader2, ShieldCheck
} from "lucide-react";
import { GreeCard, GreeCardContent } from "@/components/system/gree-card";
import { GreeButton } from "@/components/system/gree-button";
import { GreeScoreRing } from "@/components/system/gree-score-ring";
import { GreeBadge } from "@/components/system/gree-badge";
import {
  reduceOcr, initialOcrState, buildConfirmed, seedReviewValues,
  scoreReadiness, buildOcrProduct
} from "@/domains/ocr/confirm";
import { browserOcrEngine, runExtraction } from "@/domains/ocr/engine";
import type { OcrKind, NutritionFieldKey } from "@/domains/ocr/model";
import { computeGreeScore } from "@greecheck/domain/scoring/gree-score";
import { usePreferencesStore } from "@/domains/criteria/store";
import { cn } from "@/lib/utils/cn";

const NUTRITION_FIELDS: NutritionFieldKey[] = ["energyKcal", "fat", "saturatedFat", "sugars", "fiber", "proteins", "salt"];

export function OcrBeta() {
  const t = useTranslations("scan.ocr");
  const prefs = usePreferencesStore();
  const [state, dispatch] = useReducer(reduceOcr, undefined, () => initialOcrState("nutrition"));
  const [values, setValues] = useState<Partial<Record<NutritionFieldKey, number | undefined>>>({});
  const [ingredients, setIngredients] = useState("");
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const urlRef = useRef<string | undefined>(undefined);

  // Revoke the session image whenever it changes or on unmount — never leaks.
  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const setImage = (file: File) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setRotation(0);
    dispatch({ type: "IMAGE_READY", imageUrl: url });
  };

  const reset = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = undefined;
    setValues({});
    setIngredients("");
    setRotation(0);
    dispatch({ type: "RESET" });
  };

  /** Render the (rotated) image onto a canvas so OCR sees the corrected orientation. */
  const orientedCanvas = (): HTMLCanvasElement | undefined => {
    const img = imgRef.current;
    if (!img) return undefined;
    const canvas = document.createElement("canvas");
    const swap = rotation % 180 !== 0;
    canvas.width = swap ? img.naturalHeight : img.naturalWidth;
    canvas.height = swap ? img.naturalWidth : img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    return canvas;
  };

  const extract = async () => {
    const canvas = orientedCanvas();
    if (!canvas) return;
    dispatch({ type: "EXTRACT_START" });
    const result = await runExtraction(browserOcrEngine, canvas, state.kind);
    if (!result.ok) {
      dispatch({ type: "EXTRACT_FAIL", failure: result.failure });
      return;
    }
    if (state.kind === "nutrition") setValues(seedReviewValues(result.extraction.nutrition ?? {}));
    else setIngredients(result.extraction.ingredientsText ?? "");
    dispatch({ type: "EXTRACT_OK", extraction: result.extraction });
  };

  const confirm = () => {
    const data = state.kind === "nutrition"
      ? buildConfirmed("nutrition", { nutrition: values })
      : buildConfirmed("ingredients", { ingredientsText: ingredients });
    if (!data) return; // nothing usable to confirm — button is disabled anyway
    dispatch({ type: "CONFIRM", data });
  };

  const kindTabs: OcrKind[] = ["nutrition", "ingredients"];
  const confirmable = state.kind === "nutrition"
    ? Object.values(values).some((v) => typeof v === "number" && Number.isFinite(v) && v >= 0)
    : ingredients.trim().length > 0;

  return (
    <GreeCard className="border border-dashed border-natural/40">
      <GreeCardContent className="space-y-4">
        {/* beta header */}
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-pastel-butter text-score-c-ink">
            <FlaskConical className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              {t("title")}
              <GreeBadge size="sm" tone="caution">{t("beta")}</GreeBadge>
            </h2>
          </div>
          {state.step !== "capture" && (
            <button onClick={reset} aria-label={t("restart")} className="gc-pressable grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-surface-2">
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        {/* kind selector — only before an image is chosen */}
        {state.step === "capture" && (
          <>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label={t("kindLabel")}>
              {kindTabs.map((k) => (
                <button
                  key={k}
                  onClick={() => dispatch({ type: "SET_KIND", kind: k })}
                  aria-pressed={state.kind === k}
                  className={cn(
                    "gc-pressable rounded-2xl border py-2.5 text-sm font-semibold",
                    state.kind === k ? "border-transparent bg-deep text-white" : "border-line bg-surface text-muted"
                  )}
                >
                  {t(`kind.${k}`)}
                </button>
              ))}
            </div>

            <p className="flex items-start gap-1.5 rounded-2xl bg-pastel-stone px-3 py-2.5 text-xs text-muted">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-natural-strong" aria-hidden />
              {t("privacy")}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <FilePick icon={Camera} label={t("capture")} capture onFile={setImage} />
              <FilePick icon={Upload} label={t("upload")} onFile={setImage} />
            </div>
          </>
        )}

        {/* adjust: orientation correction */}
        {state.step === "adjust" && state.imageUrl && (
          <>
            <div className="overflow-hidden rounded-2xl bg-surface-3">
              <img
                ref={imgRef}
                src={state.imageUrl}
                alt={t("previewAlt")}
                className="mx-auto max-h-64 w-auto object-contain transition-transform"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            </div>
            <p className="text-center text-xs text-muted">{t("adjustHint")}</p>
            <div className="flex items-center justify-center gap-2">
              <GreeButton variant="soft" size="sm" onClick={() => setRotation((r) => (r + 270) % 360)}>
                <RotateCcw className="h-4 w-4" /> {t("rotateLeft")}
              </GreeButton>
              <GreeButton variant="soft" size="sm" onClick={() => setRotation((r) => (r + 90) % 360)}>
                <RotateCw className="h-4 w-4" /> {t("rotateRight")}
              </GreeButton>
            </div>
            <div className="flex gap-2">
              <GreeButton variant="soft" size="sm" onClick={reset} className="flex-1">{t("retake")}</GreeButton>
              <GreeButton variant="neon" size="sm" onClick={extract} className="flex-1">{t("extract")}</GreeButton>
            </div>
          </>
        )}

        {/* extracting */}
        {state.step === "extracting" && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-natural-strong" aria-hidden />
            <p className="text-sm text-muted" role="status">{t("extracting")}</p>
          </div>
        )}

        {/* review */}
        {state.step === "review" && (
          <>
            <p className="text-xs text-muted">{t("reviewHint")}</p>
            {state.kind === "nutrition" ? (
              <div className="space-y-2">
                {NUTRITION_FIELDS.map((f) => {
                  const line = state.extraction?.nutrition?.[f]?.sourceLine;
                  return (
                    <div key={f} className="flex items-center gap-2">
                      <label htmlFor={`ocr-${f}`} className="w-28 shrink-0 text-sm font-medium">{t(`field.${f}`)}</label>
                      <input
                        id={`ocr-${f}`}
                        inputMode="decimal"
                        value={values[f] ?? ""}
                        placeholder={line ? t("unreadable") : "—"}
                        onChange={(e) => {
                          const raw = e.target.value.replace(",", ".").trim();
                          setValues((v) => ({ ...v, [f]: raw === "" ? undefined : Number(raw) }));
                        }}
                        className="h-10 w-24 rounded-xl border border-line bg-surface-2 px-3 text-sm outline-none focus:ring-2 focus:ring-neon/50"
                      />
                      <span className="text-xs text-muted">{t("per100")}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                rows={5}
                aria-label={t("field.ingredients")}
                className="w-full rounded-2xl border border-line bg-surface-2 p-3 text-sm outline-none focus:ring-2 focus:ring-neon/50"
              />
            )}
            <div className="flex gap-2">
              <GreeButton variant="soft" size="sm" onClick={() => dispatch({ type: "IMAGE_READY", imageUrl: state.imageUrl! })} className="flex-1">
                {t("reExtract")}
              </GreeButton>
              <GreeButton variant="neon" size="sm" onClick={confirm} disabled={!confirmable} className="flex-1">
                <Check className="h-4 w-4" /> {t("confirm")}
              </GreeButton>
            </div>
          </>
        )}

        {/* result */}
        {state.step === "result" && state.confirmedData && (
          <OcrResult data={state.confirmedData} prefs={prefs} onRestart={reset} />
        )}

        {/* failure */}
        {state.step === "failed" && (
          <div className="space-y-3">
            <p className="flex items-start gap-2 text-sm font-semibold text-score-d-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {t(`failure.${state.failure ?? "engine_error"}`)}
            </p>
            <GreeButton variant="soft" size="sm" onClick={reset}>{t("retake")}</GreeButton>
          </div>
        )}
      </GreeCardContent>
    </GreeCard>
  );
}

/* ── confirmed result: score only when ready, always labeled ── */
function OcrResult({
  data, prefs, onRestart
}: { data: import("@/domains/ocr/model").ConfirmedOcrData; prefs: Parameters<typeof computeGreeScore>[1]; onRestart: () => void }) {
  const t = useTranslations("scan.ocr");
  const tScore = useTranslations("score");
  const readiness = scoreReadiness(data);

  const product = buildOcrProduct(data);
  // A score also needs an ingredient list to leave the "unscored" ingredients gate.
  const canScore = readiness.ready && Boolean(product.ingredientsText);
  const gree = canScore ? computeGreeScore(product, prefs) : undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-score-c-ink">
        <FlaskConical className="h-3.5 w-3.5" aria-hidden /> {t("confirmedLabel")}
      </div>

      {gree && gree.status === "scored" ? (
        <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
          <GreeScoreRing value={gree.global} size={56} label={gree.grade} />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{tScore(`verdict.${gree.verdict}`)}</p>
            <p className="text-xs text-muted">{t("scoreFromOcr")}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-pastel-butter p-3">
          <p className="text-sm font-semibold text-score-c-ink">{t("cannotScore")}</p>
          <p className="mt-1 text-xs text-score-c-ink">
            {readiness.missing.length > 0
              ? t("missingFields", { fields: readiness.missing.map((f) => t(`field.${f}`)).join(", ") })
              : t("needIngredients")}
          </p>
        </div>
      )}

      {data.ingredientsText && (
        <div className="rounded-2xl bg-surface-2 p-3">
          <p className="gc-overline mb-1">{t("field.ingredients")}</p>
          <p className="text-xs leading-relaxed text-ink">{data.ingredientsText}</p>
        </div>
      )}

      <p className="text-xs text-muted">{t("resultNote")}</p>
      <GreeButton variant="soft" size="sm" onClick={onRestart}>{t("scanAnother")}</GreeButton>
    </div>
  );
}

/* ── file/camera picker (capture=environment prefers the rear camera) ── */
function FilePick({
  icon: Icon, label, capture, onFile
}: { icon: typeof Camera; label: string; capture?: boolean; onFile: (f: File) => void }) {
  const id = `ocr-pick-${capture ? "cam" : "file"}`;
  return (
    <label htmlFor={id} className="gc-pressable flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-3 text-sm font-semibold text-ink">
      <Icon className="h-5 w-5 text-natural-strong" aria-hidden /> {label}
      <input
        id={id}
        type="file"
        accept="image/*"
        {...(capture ? { capture: "environment" as const } : {})}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = ""; // allow re-picking the same file
        }}
      />
    </label>
  );
}
