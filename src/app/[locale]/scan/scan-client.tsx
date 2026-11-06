"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  Keyboard,
  QrCode,
  RotateCw,
  ScanLine,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  SwitchCamera
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { GreeButton } from "@/components/system/gree-button";
import { GreeCard } from "@/components/system/gree-card";
import { ScanOverlay } from "@/components/scan/scan-overlay";
import type { ScanMode } from "@/components/scan/scan-frame-shape";
import { useBarcodeScanner, type CamState } from "@/hooks/use-barcode-scanner";
import { productAddUrl } from "@/domains/product/contribute";
import { gtinIdentity } from "@greecheck/domain/product/gtin";
import { getProduct } from "@/domains/product/repository";
import { parseProductCode, interpretScan } from "@/lib/utils/parse-scan";
import { createScanGate } from "@/lib/utils/scan-gate";
import { OCR_BETA_ENABLED } from "@/lib/flags";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { useCartStore } from "@/domains/cart/store";
import { useBattleStore } from "@/domains/battle/store";
import { usePreferencesStore } from "@/domains/criteria/store";
import { useHistoryStore } from "@/domains/library/history-store";
import { buildHistoryItem } from "@/domains/library/model";
import { useOnboardingStore } from "@/domains/criteria/onboarding-store";
import type { RapidScanResult } from "@/components/scan/rapid-scan-card";
import type { Product } from "@greecheck/domain/product/model";
import type { GreeScore } from "@greecheck/domain/scoring/types";

const RapidScanCard = dynamic(() => import("@/components/scan/rapid-scan-card").then((module) => module.RapidScanCard));
const FirstScanIntro = dynamic(() => import("@/components/scan/first-scan-intro").then((module) => module.FirstScanIntro));
const OcrBeta = dynamic(() => import("@/components/scan/ocr-beta").then((module) => module.OcrBeta));

type LookupState = "idle" | "loading" | "not_found" | "network_error" | "offline" | "rate_limited" | "unsupported";
type ScanSource = "product" | "cart" | "battle";

function sourceFromParam(value: string | null): ScanSource {
  return value === "cart" || value === "battle" ? value : "product";
}

export function ScanClient() {
  const t = useTranslations("scan");
  const locale = useLocale();
  const tProduct = useTranslations("product");
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = sourceFromParam(searchParams.get("source"));
  const tScore = useTranslations("score");
  const addProductToCart = useCartStore((s) => s.addProduct);
  const cartItems = useCartStore((s) => s.items);
  const addBattle = useBattleStore((state) => state.add);
  const battleItems = useBattleStore((s) => s.items);
  const addHistory = useHistoryStore((s) => s.add);
  const onboardingSeen = useOnboardingStore((s) => s.seen);
  const markOnboardingSeen = useOnboardingStore((s) => s.markSeen);
  const prefs = usePreferencesStore();

  const [mode, setMode] = useState<ScanMode>("barcode");
  const [lookup, setLookup] = useState<LookupState>("idle");
  const detected = lookup === "loading";
  const [lastCode, setLastCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  // Rapid Scan Session — act on a detected product without leaving GreeLens.
  const [rapid, setRapid] = useState<RapidScanResult | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [showIntro, setShowIntro] = useState(false);
  const sessionCodesRef = useRef<Set<string>>(new Set());
  // Time-based duplicate cooldown: same code resolves at most once per window.
  const scanGateRef = useRef(createScanGate());
  const lookupToken = useRef<symbol | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => {
    lookupToken.current = null;
    clearTimeout(noticeTimer.current);
  }, []);

  const flashNotice = useCallback((message: string) => {
    clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(null), 3200);
  }, []);

  // History is written locally on EVERY successful resolve (dedupes by barcode).
  const recordHistory = useCallback(
    (product: Product, gree: GreeScore) => {
      addHistory(buildHistoryItem(product, gree, (gree.status === "scored" ? tScore(`grade.${gree.grade}`) : tScore("gs3Unavailable"))));
    },
    [addHistory, tScore]
  );

  const resolveProduct = useCallback(
    async (code: string) => {
      if (lookupToken.current) return;
      const token = Symbol();
      lookupToken.current = token;
      setLookup("loading");
      setLastCode(code);

      try {
        const result = await getProduct(code);
        if (lookupToken.current !== token) return;
        if (result.kind !== "product") {
          const offline = typeof navigator !== "undefined" && navigator.onLine === false;
          setLookup(
            result.kind === "not_found" ? "not_found"
              : result.kind === "rate_limited" ? "rate_limited"
              : offline ? "offline" : "network_error"
          );
          // A failed resolution must not lock the code behind the cooldown.
          scanGateRef.current.release(gtinIdentity(code) ?? code);
          return;
        }

        const { computeGreeScore } = await import("@greecheck/domain/scoring/gree-score");
        if (lookupToken.current !== token) return;
        const gree = computeGreeScore(result.product, prefs);
        recordHistory(result.product, gree);

        const identity = gtinIdentity(result.product.barcode) ?? result.product.barcode;
        if (!sessionCodesRef.current.has(identity)) {
          sessionCodesRef.current.add(identity);
          setSessionCount(sessionCodesRef.current.size);
        }

        // Explicit "scan to add" flows (launched from GreeCart / Battle) keep
        // their direct behavior — the user already declared the intent.
        if (source === "cart") {
          addProductToCart(result.product, gree);
          router.push("/cart");
          return;
        }
        if (source === "battle") {
          addBattle(result.product);
          router.push("/compare");
          return;
        }

        // Default GreeLens flow → Rapid Scan Session (no forced navigation).
        setLookup("idle");
        setRapid({ product: result.product, gree, stale: result.stale });
      } catch {
        if (lookupToken.current !== token) return;
        setLookup(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "network_error");
        scanGateRef.current.release(gtinIdentity(code) ?? code);
      } finally {
        if (lookupToken.current === token) lookupToken.current = null;
      }
    },
    [addBattle, addProductToCart, prefs, recordHistory, router, source]
  );

  const handleDetect = useCallback(
    (raw: string, format?: string) => {
      if (lookupToken.current) return false;
      const parsed = interpretScan(raw, format);
      if (parsed.kind !== "product") {
        // Explicit unsupported state — a QR without a product identifier is
        // NEVER treated as a product, and an invalid check digit never resolves.
        setLookup("unsupported");
        flashNotice(parsed.reason === "qr_no_product" ? t("qrNoProduct") : t("unsupportedCode"));
        return false; // keep scanning — this frame was not a product code
      }
      // Duplicate cooldown: the same code resolves at most once per window,
      // while the camera stays live for the next product.
      if (!scanGateRef.current.shouldResolve(gtinIdentity(parsed.code) ?? parsed.code)) {
        flashNotice(t("rapid.alreadyScanned"));
        return false;
      }
      // Physical confirmation that a code was READ (not yet a result claim).
      if (navigator.userActivation?.hasBeenActive && document.visibilityState === "visible") {
        navigator.vibrate?.(35);
      }
      void resolveProduct(parsed.code);
      return true; // handled → the hook pauses the stream until "scan another"
    },
    [flashNotice, resolveProduct, t]
  );

  const {
    videoRef,
    state,
    devices,
    selectedDeviceId,
    torchSupported,
    torchOn,
    zoomSupported,
    zoom,
    switchCamera,
    toggleTorch,
    setZoom,
    retry,
    stop
  } = useBarcodeScanner({ onDetect: handleDetect });

  const manualCode = parseProductCode(manual);
  const manualValid = Boolean(manualCode);
  const goManual = () => {
    if (lookupToken.current || rapid) return;
    if (!manualCode) {
      setLookup("unsupported");
      return;
    }
    stop();
    void resolveProduct(manualCode);
  };

  const retryAll = () => {
    setLookup("idle");
    setLastCode("");
    retry();
  };

  // ── Rapid Scan Session derived state + actions ──
  const rapidBarcode = rapid?.product.barcode;
  const inCart = Boolean(rapidBarcode && cartItems.some((i) => i.product.barcode === rapidBarcode));
  const inBattle = Boolean(rapidBarcode && battleItems.some((x) => x.barcode === rapidBarcode));
  const battleFull = battleItems.length >= 3 && !inBattle;

  const rapidViewResult = () => {
    if (!rapid) return;
    stop();
    router.push(`/product/${rapid.product.barcode}`);
  };
  const rapidAddToCart = () => {
    if (!rapid) return;
    const r = addProductToCart(rapid.product, rapid.gree);
    flashNotice(r === "added" ? t("rapid.addedToCart") : t("rapid.inCart"));
  };
  const rapidAddToBattle = () => {
    if (!rapid) return;
    const r = addBattle(rapid.product);
    flashNotice(r === "added" ? t("rapid.addedToBattle") : r === "full" ? t("rapid.battleFull") : t("rapid.alreadyInBattle"));
  };
  const rapidScanAnother = () => {
    setRapid(null);
    setLookup("idle");
    setLastCode("");
    retry();
  };
  const dismissIntro = () => {
    setShowIntro(false);
    markOnboardingSeen();
  };

  const modes: { id: ScanMode; icon: typeof ScanLine }[] = [
    { id: "barcode", icon: ScanLine },
    { id: "qr", icon: QrCode }
  ];

  const statusText: Record<CamState, string> = {
    idle: "",
    requesting: t("requesting"),
    preview: t("preparingDecoder"),
    active: t("scanningStatus"),
    paused: t("paused"),
    insecure: t("httpsRequiredTitle"),
    denied: t("cameraDenied"),
    "no-camera": t("noCameraFound"),
    "in-use": t("cameraInUse"),
    unsupported: t("cameraUnsupported"),
    error: t("cameraUnsupported")
  };
  const phaseText = t("analyzingNutrition");
  const liveStatus = detected ? phaseText : statusText[state];
  const cameraPreview = state === "idle" || state === "preview" || state === "active" || state === "requesting" || detected;

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h1 className="gc-editorial text-[clamp(1.85rem,4vw,2.75rem)]">{t("title")}</h1>
        <span className="text-sm text-muted">{t("scannerLabel")}</span>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{liveStatus}</p>

      <AnimatePresence>
        {rapid && (
          <RapidScanCard
            key={rapid.product.barcode}
            result={rapid}
            prefs={prefs}
            sessionCount={sessionCount}
            inCart={inCart}
            inBattle={inBattle}
            battleFull={battleFull}
            onViewResult={rapidViewResult}
            onAddToCart={rapidAddToCart}
            onAddToBattle={rapidAddToBattle}
            onScanAnother={rapidScanAnother}
          />
        )}
      </AnimatePresence>

      {rapid && !onboardingSeen && (
        <button type="button" onClick={() => setShowIntro(true)} className="min-h-10 text-sm font-semibold text-natural-strong hover:underline">
          {t("intro.open")}
        </button>
      )}
      {showIntro && <FirstScanIntro onDone={dismissIntro} />}

      {!rapid && (
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1" role="group" aria-label={`${t("barcode")} / ${t("qr")}`}>
        {modes.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              data-active={active}
              aria-pressed={active}
              aria-label={t(m.id)}
              className="gc-pressable flex items-center justify-center gap-2 min-h-11 rounded-lg border border-transparent py-1.5 text-sm font-semibold text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/60 data-[active=true]:border-line data-[active=true]:bg-surface data-[active=true]:text-ink"
            >
              <Icon className="h-5 w-5" aria-hidden />
              {t(m.id)}
            </button>
          );
        })}
      </div>

      )}

      <GreeCard className={`relative min-h-[clamp(14rem,37svh,20rem)] overflow-hidden ${rapid ? "hidden" : ""} ${cameraPreview ? "bg-deep" : "bg-surface"}`} role="region" aria-label={t("title")}>
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${(state === "active" || state === "preview") ? "opacity-100" : "opacity-0"}`}
          muted
          playsInline
          autoPlay
          aria-hidden
        />
        {cameraPreview && <div className="absolute inset-0 bg-deep/20" aria-hidden />}

        {(state === "active" || state === "preview" || state === "requesting") && <ScanOverlay mode={mode} detected={detected} />}

        {state === "active" && !detected && (
          <div className="absolute inset-x-4 bottom-3 rounded-xl bg-black/75 px-3 py-2 text-center text-white">
            <p className="text-sm font-semibold">{t("searchingCode")}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {detected && (
            <motion.div
              key="identifying"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-2 text-sm font-semibold text-neon"
            >
              <span className="h-2 w-2 rounded-full bg-neon" aria-hidden />
              {phaseText}
            </motion.div>
          )}
        </AnimatePresence>

        {(state === "requesting" || state === "preview") && (
          <div className="absolute inset-0 grid place-items-center text-white/75">
            <div className="flex flex-col items-center gap-2">
              <Camera className="h-6 w-6" aria-hidden />
              <span className="rounded-lg bg-deep/80 px-2.5 py-1 text-sm">{state === "preview" ? t("preparingDecoder") : t("requesting")}</span>
            </div>
          </div>
        )}

        {!rapid && (state !== "paused" || lookup === "idle") && <CameraStatePanel state={state} retry={retryAll} />}

        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="absolute inset-x-4 top-4 rounded-2xl bg-black/60 px-4 py-2.5 text-center text-sm text-white backdrop-blur"
            >
              {notice}
            </motion.div>
          )}
        </AnimatePresence>
      </GreeCard>

      {state === "active" && !detected && !rapid && (
        <p className="px-1 text-sm leading-relaxed text-muted">{t("scanGuidance")}</p>
      )}

      {state === "active" && !rapid && (devices.length > 1 || torchSupported || zoomSupported) && (
        <ScannerControls
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          torchSupported={torchSupported}
          torchOn={torchOn}
          zoomSupported={zoomSupported}
          zoom={zoom}
          onSwitchCamera={switchCamera}
          onToggleTorch={toggleTorch}
          onZoom={setZoom}
        />
      )}

      {lookup !== "idle" && lookup !== "loading" && (
        <GreeCard className="border-score-d/25 bg-score-d/5 p-4">
          <p className="flex items-start gap-2 text-sm font-semibold text-score-d-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {lookup === "not_found"
              ? t("productNotFound", { code: lastCode })
              : lookup === "network_error"
                ? t("networkError")
                : lookup === "offline"
                  ? t("offline")
                  : lookup === "rate_limited"
                    ? t("rateLimited")
                    : t("unsupportedCode")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <GreeButton variant="neon" size="sm" onClick={lastCode && ["network_error", "offline", "rate_limited"].includes(lookup) ? () => void resolveProduct(lastCode) : retryAll}>
              <RotateCw className="h-4 w-4" /> {t("retry")}
            </GreeButton>
            <GreeButton variant="soft" size="sm" onClick={() => router.push("/search")}>
              <Search className="h-4 w-4" /> {t("searchInstead")}
            </GreeButton>
            {lookup === "not_found" && lastCode && (
              <a className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-natural-strong hover:underline" href={productAddUrl(lastCode, locale)} target="_blank" rel="noopener noreferrer">
                {tProduct("contribute")}
              </a>
            )}
          </div>
        </GreeCard>
      )}


      <GreeCard className="p-4">
        <label htmlFor="manual-barcode" className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <Keyboard className="h-3.5 w-3.5" aria-hidden /> {t("manual")}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="manual-barcode"
            value={manual}
            onChange={(e) => setManual(e.target.value.trim().slice(0, 96))}
            onKeyDown={(e) => e.key === "Enter" && goManual()}
            inputMode={mode === "barcode" ? "numeric" : "text"}
            autoComplete="off"
            dir="ltr"
            aria-invalid={manual.length > 0 && !manualValid}
            placeholder={t("manualPlaceholder")}
            className="gc-field h-11 min-w-0 flex-1 px-3 text-base"
          />
          <GreeButton variant="neon" size="icon" disabled={!manualValid || detected || Boolean(rapid)} onClick={goManual} aria-label={t("enterBarcode")}>
            <ArrowRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
          </GreeButton>
        </div>
        <button
          type="button"
          onClick={() => {
            stop();
            router.push("/search");
          }}
          className="mt-1 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-natural-strong hover:underline"
        >
          <Search className="h-4 w-4" aria-hidden /> {t("searchInstead")}
        </button>
      </GreeCard>

      <p className="flex items-center justify-center gap-1.5 px-2 text-center text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-natural-strong" aria-hidden />
        {t("privacyNote")}
      </p>

      {/* OCR beta — isolated experimental flow, gated behind a build flag. */}
      {OCR_BETA_ENABLED && (
        <CollapsibleSection title={t("ocr.title")}>
          <OcrBeta />
        </CollapsibleSection>
      )}

    </div>
  );
}

function CameraStatePanel({ state, retry }: { state: CamState; retry: () => void }) {
  const t = useTranslations("scan");
  const router = useRouter();
  const fallbackStates = ["denied", "no-camera", "in-use", "unsupported", "error", "insecure"];
  const focusManual = () => {
    const el = document.getElementById("manual-barcode") as HTMLInputElement | null;
    el?.focus();
  };
  if (!["insecure", "denied", "no-camera", "in-use", "unsupported", "error", "paused"].includes(state)) return null;

  const copy: Record<string, { title: string; body: string; icon: ReactNode; retry?: boolean }> = {
    insecure: {
      title: t("httpsRequiredTitle"),
      body: t("httpsRequiredBody"),
      icon: <Smartphone className="h-7 w-7" />
    },
    denied: {
      title: t("cameraDenied"),
      body: t("cameraDeniedHelp"),
      icon: <CameraOff className="h-7 w-7" />,
      retry: true
    },
    "no-camera": {
      title: t("noCameraFound"),
      body: t("noCameraFoundHelp"),
      icon: <CameraOff className="h-7 w-7" />,
      retry: true
    },
    "in-use": {
      title: t("cameraInUse"),
      body: t("cameraInUseHelp"),
      icon: <CameraOff className="h-7 w-7" />,
      retry: true
    },
    unsupported: {
      title: t("cameraUnsupported"),
      body: t("cameraUnsupportedHelp"),
      icon: <CameraOff className="h-7 w-7" />
    },
    error: {
      title: t("cameraUnsupported"),
      body: t("genericCameraError"),
      icon: <CameraOff className="h-7 w-7" />,
      retry: true
    },
    paused: {
      title: t("paused"),
      body: t("pausedHelp"),
      icon: <Camera className="h-7 w-7" />,
      retry: true
    }
  };

  const item = copy[state];
  return (
    <div className="space-y-2 p-4">
      <div className="flex items-center gap-2 text-ink">
        <span aria-hidden className="shrink-0 text-natural-strong [&>svg]:size-5">{item.icon}</span>
        <p className="font-semibold">{item.title}</p>
      </div>
      <p className="text-sm leading-relaxed text-muted">{item.body}</p>
      {state === "insecure" && <p className="text-sm text-muted">{t("httpsTunnelHelp")}</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        {item.retry && <GreeButton variant="outline" size="sm" onClick={retry}>{t("retry")}</GreeButton>}
        {fallbackStates.includes(state) && (
          <>
            <GreeButton variant="outline" size="sm" onClick={() => router.push("/search")}>{t("searchInstead")}</GreeButton>
            <GreeButton variant="ghost" size="sm" onClick={focusManual}>{t("focusManual")}</GreeButton>
          </>
        )}
      </div>
    </div>
  );
}

function ScannerControls({
  devices,
  selectedDeviceId,
  torchSupported,
  torchOn,
  zoomSupported,
  zoom,
  onSwitchCamera,
  onToggleTorch,
  onZoom
}: {
  devices: MediaDeviceInfo[];
  selectedDeviceId?: string;
  torchSupported: boolean;
  torchOn: boolean;
  zoomSupported: boolean;
  zoom?: number;
  onSwitchCamera: (deviceId?: string) => void;
  onToggleTorch: () => void;
  onZoom: (value: number) => void;
}) {
  const t = useTranslations("scan");
  return (
    <GreeCard className="space-y-3 p-3">
      <div className="flex flex-wrap gap-2">
        {devices.length > 1 && (
          <GreeButton variant="soft" size="sm" onClick={() => onSwitchCamera()}>
            <SwitchCamera className="h-4 w-4" /> {t("switchCamera")}
          </GreeButton>
        )}
        {torchSupported && (
          <GreeButton variant={torchOn ? "neon" : "soft"} size="sm" onClick={onToggleTorch} aria-pressed={torchOn}>
            {torchOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
            {torchOn ? t("torchOff") : t("torchOn")}
          </GreeButton>
        )}
        {zoomSupported && (
          <GreeButton variant="soft" size="sm" onClick={() => onZoom((zoom ?? 1) + 0.25)}>
            <SlidersHorizontal className="h-4 w-4" /> {t("zoom")}
          </GreeButton>
        )}
      </div>
      {devices.length > 1 && (
        <label className="block text-xs font-medium text-muted">
          {t("camera")}
          <select
            value={selectedDeviceId ?? ""}
            onChange={(e) => onSwitchCamera(e.target.value)}
            className="mt-1 h-10 w-full rounded-2xl border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-neon/50"
          >
            {devices.map((device, index) => (
              <option key={device.deviceId || index} value={device.deviceId}>
                {device.label || t("cameraN", { n: index + 1 })}
              </option>
            ))}
          </select>
        </label>
      )}
    </GreeCard>
  );
}
