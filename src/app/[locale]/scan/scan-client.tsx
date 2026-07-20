"use client";
import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { GreePulse } from "@/components/system/gree-pulse";
import { GreeCard } from "@/components/system/gree-card";
import { ScanOverlay } from "@/components/scan/scan-overlay";
import type { ScanMode } from "@/components/scan/scan-frame-shape";
import { useBarcodeScanner, type CamState } from "@/hooks/use-barcode-scanner";
import { getProduct } from "@/domains/product/repository";
import { parseProductCode } from "@/lib/utils/parse-scan";
import { computeGreeScore } from "@greecheck/domain/scoring/gree-score";
import { useCartStore } from "@/domains/cart/store";
import { useBattleStore } from "@/domains/battle/store";
import { usePreferencesStore } from "@/domains/criteria/store";
import { useHistoryStore } from "@/domains/library/history-store";
import { buildHistoryItem } from "@/domains/library/model";
import { useOnboardingStore } from "@/domains/criteria/onboarding-store";
import { RapidScanCard, type RapidScanResult } from "@/components/scan/rapid-scan-card";
import { FirstScanIntro } from "@/components/scan/first-scan-intro";
import type { Product } from "@greecheck/domain/product/model";
import type { GreeScore } from "@greecheck/domain/scoring/types";

type LookupState = "idle" | "loading" | "not_found" | "network_error" | "rate_limited" | "unsupported";
type ScanSource = "product" | "cart" | "battle";

function sourceFromParam(value: string | null): ScanSource {
  return value === "cart" || value === "battle" ? value : "product";
}

export function ScanClient() {
  const t = useTranslations("scan");
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
  const [phase, setPhase] = useState<"idle" | "detected" | "analyzing">("idle");
  const detected = phase !== "idle";
  const [lookup, setLookup] = useState<LookupState>("idle");
  const [lastCode, setLastCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  // Rapid Scan Session — act on a detected product without leaving GreeLens.
  const [rapid, setRapid] = useState<RapidScanResult | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [showIntro, setShowIntro] = useState(false);
  const sessionCodesRef = useRef<Set<string>>(new Set());
  const lastResolvedCodeRef = useRef("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flashNotice = useCallback((message: string) => {
    clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(null), 3200);
  }, []);

  // History is written locally on EVERY successful resolve (dedupes by barcode).
  const recordHistory = useCallback(
    (product: Product, gree: GreeScore) => {
      addHistory(buildHistoryItem(product, gree, tScore(`grade.${gree.grade}`)));
    },
    [addHistory, tScore]
  );

  const resolveProduct = useCallback(
    async (code: string) => {
      // GreeLens staged feedback: detected → analyzing → result.
      setPhase("detected");
      setLookup("loading");
      setLastCode(code);
      await new Promise((r) => setTimeout(r, 550));
      setPhase("analyzing");

      try {
        const result = await getProduct(code);
        if (result.kind !== "product") {
          setPhase("idle");
          setLookup(result.kind === "not_found" ? "not_found" : result.kind === "rate_limited" ? "rate_limited" : "network_error");
          return;
        }

        const gree = computeGreeScore(result.product, prefs);
        recordHistory(result.product, gree);
        lastResolvedCodeRef.current = result.product.barcode;
        if (!sessionCodesRef.current.has(result.product.barcode)) {
          sessionCodesRef.current.add(result.product.barcode);
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
          router.push("/battle");
          return;
        }

        // Default GreeLens flow → Rapid Scan Session (no forced navigation).
        setPhase("idle");
        setLookup("idle");
        setRapid({ product: result.product, gree, stale: result.stale });
        // First-scan onboarding: once only, AFTER a successful scan.
        if (!onboardingSeen) setShowIntro(true);
      } catch {
        setPhase("idle");
        setLookup("network_error");
      }
    },
    [addBattle, addProductToCart, onboardingSeen, prefs, recordHistory, router, source]
  );

  const handleDetect = useCallback(
    (raw: string) => {
      const code = parseProductCode(raw);
      if (!code) {
        setLookup("unsupported");
        flashNotice(t("unsupportedCode"));
        return false; // keep scanning — this frame was not a product code
      }
      // Prevent duplicate rapid scans: ignore the barcode we just resolved and
      // keep the camera live so the shopper can aim at a DIFFERENT product.
      if (code === lastResolvedCodeRef.current) {
        flashNotice(t("rapid.alreadyScanned"));
        return false;
      }
      void resolveProduct(code);
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
    if (!manualCode) {
      setLookup("unsupported");
      return;
    }
    stop();
    void resolveProduct(manualCode);
  };

  const retryAll = () => {
    setPhase("idle");
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

  const statusText: Record<CamState | "detected", string> = {
    idle: "",
    checking: t("checkingEnvironment"),
    requesting: t("requesting"),
    active: t("scanningStatus"),
    paused: t("paused"),
    insecure: t("httpsRequiredTitle"),
    denied: t("cameraDenied"),
    "no-camera": t("noCameraFound"),
    "in-use": t("cameraInUse"),
    unsupported: t("cameraUnsupported"),
    error: t("cameraUnsupported"),
    detected: t("analyzing")
  };
  const phaseText = phase === "detected" ? t("productDetected") : phase === "analyzing" ? t("analyzingNutrition") : "";
  const liveStatus = detected ? phaseText : statusText[state];

  return (
    <div className="mx-auto max-w-md space-y-5 pb-4">
      <div className="flex items-center justify-center gap-2.5">
        <GreePulse
          size={36}
          state={phase === "analyzing" ? "success" : state === "active" ? "scanning" : "idle"}
          label={liveStatus}
        />
        <h1 className="text-xl font-bold tracking-tight gc-gradient-text">{t("title")}</h1>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{liveStatus}</p>

      <AnimatePresence>
        {rapid && (
          <RapidScanCard
            key={rapid.product.barcode}
            result={rapid}
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

      <AnimatePresence>
        {showIntro && <FirstScanIntro key="intro" onDone={dismissIntro} />}
      </AnimatePresence>

      <GreeCard className="relative h-[clamp(18rem,43svh,28rem)] overflow-hidden bg-deep-grad p-0" role="region" aria-label={t("title")}>
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${state === "active" ? "opacity-100" : "opacity-0"}`}
          muted
          playsInline
          autoPlay
          aria-hidden
        />
        <div className="absolute inset-0 bg-deep/30" aria-hidden />

        {(state === "active" || state === "requesting") && <ScanOverlay mode={mode} detected={detected} />}

        {state === "active" && !detected && (
          <div className="absolute inset-x-4 bottom-4 space-y-2 text-center text-white">
            <p className="text-sm font-semibold">{t("searchingCode")}</p>
            <p className="rounded-2xl bg-black/35 px-3 py-2 text-xs leading-relaxed text-white/78 backdrop-blur">
              {t("scanGuidance")}
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {detected && (
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-2 text-sm font-semibold text-neon"
            >
              <span className="h-2 w-2 animate-ping rounded-full bg-neon" aria-hidden />
              {phaseText}
            </motion.div>
          )}
        </AnimatePresence>

        {(state === "checking" || state === "requesting") && (
          <div className="absolute inset-0 grid place-items-center text-white/75">
            <div className="flex flex-col items-center gap-2">
              <Camera className="h-6 w-6 animate-pulse" aria-hidden />
              <span className="text-sm">{state === "checking" ? t("checkingEnvironment") : t("requesting")}</span>
            </div>
          </div>
        )}

        {!rapid && <CameraStatePanel state={state} retry={retryAll} />}

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

      {state === "active" && (
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
                : lookup === "rate_limited"
                  ? t("rateLimited")
                  : t("unsupportedCode")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <GreeButton variant="neon" size="sm" onClick={retryAll}>
              <RotateCw className="h-4 w-4" /> {t("retry")}
            </GreeButton>
            <GreeButton variant="soft" size="sm" onClick={() => router.push("/search")}>
              <Search className="h-4 w-4" /> {t("searchInstead")}
            </GreeButton>
          </div>
        </GreeCard>
      )}

      <p className="flex items-center justify-center gap-1.5 px-2 text-center text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-natural-strong" aria-hidden />
        {t("privacyNote")}
      </p>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label={`${t("barcode")} / ${t("qr")}`}>
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
              className="gc-pressable flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface py-3 text-sm font-semibold text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/60 data-[active=true]:border-transparent data-[active=true]:bg-deep data-[active=true]:text-white"
            >
              <Icon className="h-5 w-5" aria-hidden />
              {t(m.id)}
            </button>
          );
        })}
      </div>

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
            inputMode="text"
            autoComplete="off"
            aria-invalid={manual.length > 0 && !manualValid}
            placeholder={t("manualPlaceholder")}
            className="h-11 flex-1 rounded-2xl border border-line bg-surface-2 px-4 text-sm outline-none focus:ring-2 focus:ring-neon/50"
          />
          <GreeButton variant="neon" size="icon" disabled={!manualValid || lookup === "loading"} onClick={goManual} aria-label={t("enterBarcode")}>
            <ArrowRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
          </GreeButton>
        </div>
        <button
          type="button"
          onClick={() => {
            stop();
            router.push("/search");
          }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-1 text-sm font-medium text-natural-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/60"
        >
          <Search className="h-4 w-4" aria-hidden /> {t("searchInstead")}
        </button>
      </GreeCard>

    </div>
  );
}

function CameraStatePanel({ state, retry }: { state: CamState; retry: () => void }) {
  const t = useTranslations("scan");
  const router = useRouter();
  const fallbackStates = ["denied", "no-camera", "in-use", "unsupported", "error", "insecure"];
  const focusManual = () => {
    const el = document.getElementById("manual-barcode") as HTMLInputElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
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
    <div className="absolute inset-0 grid place-items-center p-5">
      <div className="flex max-w-xs flex-col items-center gap-3 rounded-3xl bg-black/45 p-5 text-center text-white backdrop-blur">
        <span className="grid h-16 w-16 place-items-center rounded-3xl bg-white/10" aria-hidden>{item.icon}</span>
        <p className="font-semibold">{item.title}</p>
        <p className="text-sm leading-relaxed text-white/72">{item.body}</p>
        {state === "insecure" && (
          <p className="rounded-2xl bg-neon/10 px-3 py-2 text-xs font-medium text-neon">{t("httpsTunnelHelp")}</p>
        )}
        {item.retry && (
          <GreeButton variant="neon" size="sm" onClick={retry}>
            <RotateCw className="h-4 w-4" aria-hidden /> {t("retry")}
          </GreeButton>
        )}
        {fallbackStates.includes(state) && (
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <GreeButton variant="soft" size="sm" onClick={() => router.push("/search")}>
              <Search className="h-4 w-4" aria-hidden /> {t("searchInstead")}
            </GreeButton>
            <GreeButton variant="soft" size="sm" onClick={focusManual}>
              <Keyboard className="h-4 w-4" aria-hidden /> {t("enterBarcode")}
            </GreeButton>
          </div>
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
          <GreeButton variant={torchOn ? "neon" : "soft"} size="sm" onClick={onToggleTorch}>
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
