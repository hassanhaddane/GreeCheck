"use client";
import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Bug,
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScanOverlay } from "@/components/scan/scan-overlay";
import type { ScanMode } from "@/components/scan/scan-frame-shape";
import {
  SUPPORTED_FORMAT_LABELS,
  useBarcodeScanner,
  type CamState,
  type ScannerDebugInfo
} from "@/hooks/use-barcode-scanner";
import { getProduct } from "@/lib/api/client";
import { parseProductCode } from "@/lib/utils/parse-scan";
import { computeGreeScore } from "@/lib/scoring/gree-score";
import { useBasketStore } from "@/stores/basket-store";
import { useBattleStore } from "@/stores/battle-store";
import { usePreferencesStore } from "@/stores/preferences-store";

type LookupState = "idle" | "loading" | "not_found" | "network_error" | "unsupported";
type ScanSource = "product" | "basket" | "battle";

function sourceFromParam(value: string | null): ScanSource {
  return value === "basket" || value === "battle" ? value : "product";
}

export function ScanClient() {
  const t = useTranslations("scan");
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = sourceFromParam(searchParams.get("source"));
  const basket = useBasketStore();
  const addBattle = useBattleStore((state) => state.add);
  const prefs = usePreferencesStore();

  const [mode, setMode] = useState<ScanMode>("barcode");
  const [phase, setPhase] = useState<"idle" | "detected" | "analyzing">("idle");
  const detected = phase !== "idle";
  const [lookup, setLookup] = useState<LookupState>("idle");
  const [lastCode, setLastCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flashNotice = useCallback((message: string) => {
    clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(null), 3200);
  }, []);

  const resolveProduct = useCallback(
    async (code: string) => {
      // GreeLens staged feedback: detected → analyzing → navigate.
      setPhase("detected");
      setLookup("loading");
      setLastCode(code);
      await new Promise((r) => setTimeout(r, 550));
      setPhase("analyzing");

      try {
        const result = await getProduct(code);
        if (result.status === "not_found") {
          setPhase("idle");
          setLookup("not_found");
          return;
        }

        if (source === "basket") {
          basket.addProduct(result.product, computeGreeScore(result.product, prefs));
          router.push("/basket");
          return;
        }
        if (source === "battle") {
          addBattle(result.product);
          router.push("/battle");
          return;
        }

        router.push(`/product/${result.product.barcode}`);
      } catch {
        setPhase("idle");
        setLookup("network_error");
      }
    },
    [addBattle, basket, prefs, router, source]
  );

  const handleDetect = useCallback(
    (raw: string) => {
      const code = parseProductCode(raw);
      if (!code) {
        setLookup("unsupported");
        flashNotice(t("unsupportedCode"));
        return false;
      }
      void resolveProduct(code);
      return true;
    },
    [flashNotice, resolveProduct, t]
  );

  const scanner = useBarcodeScanner({ onDetect: handleDetect });

  const manualCode = parseProductCode(manual);
  const manualValid = Boolean(manualCode);
  const goManual = () => {
    if (!manualCode) {
      setLookup("unsupported");
      return;
    }
    scanner.stop();
    void resolveProduct(manualCode);
  };

  const retryAll = () => {
    setPhase("idle");
    setLookup("idle");
    setLastCode("");
    scanner.retry();
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
  const liveStatus = detected ? phaseText : statusText[scanner.state];

  return (
    <div className="mx-auto max-w-md space-y-5 pb-4">
      <div className="flex items-center justify-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-neon-grad text-deep shadow-glow" aria-hidden>
          <ScanLine className="h-4 w-4" />
        </span>
        <h1 className="text-xl font-bold tracking-tight gc-gradient-text">{t("title")}</h1>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{liveStatus}</p>

      <Card className="relative aspect-[3/4] overflow-hidden bg-deep-grad p-0" role="region" aria-label={t("title")}>
        <video
          ref={scanner.videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${scanner.state === "active" ? "opacity-100" : "opacity-0"}`}
          muted
          playsInline
          autoPlay
          aria-hidden
        />
        <div className="absolute inset-0 bg-deep/30" aria-hidden />

        {(scanner.state === "active" || scanner.state === "requesting") && <ScanOverlay mode={mode} detected={detected} />}

        {scanner.state === "active" && !detected && (
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

        {(scanner.state === "checking" || scanner.state === "requesting") && (
          <div className="absolute inset-0 grid place-items-center text-white/75">
            <div className="flex flex-col items-center gap-2">
              <Camera className="h-6 w-6 animate-pulse" aria-hidden />
              <span className="text-sm">{scanner.state === "checking" ? t("checkingEnvironment") : t("requesting")}</span>
            </div>
          </div>
        )}

        <CameraStatePanel state={scanner.state} retry={retryAll} />

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
      </Card>

      {scanner.state === "active" && (
        <ScannerControls
          devices={scanner.devices}
          selectedDeviceId={scanner.selectedDeviceId}
          torchSupported={scanner.torchSupported}
          torchOn={scanner.torchOn}
          zoomSupported={scanner.zoomSupported}
          zoom={scanner.zoom}
          onSwitchCamera={scanner.switchCamera}
          onToggleTorch={scanner.toggleTorch}
          onZoom={scanner.setZoom}
        />
      )}

      {lookup !== "idle" && lookup !== "loading" && (
        <Card className="border-score-d/25 bg-score-d/5 p-4">
          <p className="flex items-start gap-2 text-sm font-semibold text-score-d">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {lookup === "not_found"
              ? t("productNotFound", { code: lastCode })
              : lookup === "network_error"
                ? t("networkError")
                : t("unsupportedCode")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="neon" size="sm" onClick={retryAll}>
              <RotateCw className="h-4 w-4" /> {t("retry")}
            </Button>
            <Button variant="soft" size="sm" onClick={() => router.push("/search")}>
              <Search className="h-4 w-4" /> {t("searchInstead")}
            </Button>
          </div>
        </Card>
      )}

      <p className="flex items-center justify-center gap-1.5 px-2 text-center text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-natural" aria-hidden />
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

      <Card className="p-4">
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
          <Button variant="neon" size="icon" disabled={!manualValid || lookup === "loading"} onClick={goManual} aria-label={t("manual")}>
            <ArrowRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
          </Button>
        </div>
        <button
          type="button"
          onClick={() => {
            scanner.stop();
            router.push("/search");
          }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-1 text-sm font-medium text-natural focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/60"
        >
          <Search className="h-4 w-4" aria-hidden /> {t("searchInstead")}
        </button>
      </Card>

      {process.env.NODE_ENV !== "production" && <ScannerDebugPanel debug={scanner.debug} />}
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
          <Button variant="neon" size="sm" onClick={retry}>
            <RotateCw className="h-4 w-4" aria-hidden /> {t("retry")}
          </Button>
        )}
        {fallbackStates.includes(state) && (
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Button variant="soft" size="sm" onClick={() => router.push("/search")}>
              <Search className="h-4 w-4" aria-hidden /> {t("searchInstead")}
            </Button>
            <Button variant="soft" size="sm" onClick={focusManual}>
              <Keyboard className="h-4 w-4" aria-hidden /> {t("enterBarcode")}
            </Button>
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
    <Card className="space-y-3 p-3">
      <div className="flex flex-wrap gap-2">
        {devices.length > 1 && (
          <Button variant="soft" size="sm" onClick={() => onSwitchCamera()}>
            <SwitchCamera className="h-4 w-4" /> {t("switchCamera")}
          </Button>
        )}
        {torchSupported && (
          <Button variant={torchOn ? "neon" : "soft"} size="sm" onClick={onToggleTorch}>
            {torchOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
            {torchOn ? t("torchOff") : t("torchOn")}
          </Button>
        )}
        {zoomSupported && (
          <Button variant="soft" size="sm" onClick={() => onZoom((zoom ?? 1) + 0.25)}>
            <SlidersHorizontal className="h-4 w-4" /> {t("zoom")}
          </Button>
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
    </Card>
  );
}

function ScannerDebugPanel({ debug }: { debug: ScannerDebugInfo }) {
  const t = useTranslations("scan.debug");
  const rows = [
    [t("secureContext"), String(debug.secureContext)],
    [t("mediaDevices"), String(debug.mediaDevices)],
    [t("getUserMedia"), String(debug.getUserMedia)],
    [t("permission"), debug.permission],
    [t("selectedCamera"), debug.selectedCameraLabel || "-"],
    [t("cameraCount"), String(debug.availableCamerasCount)],
    [t("engine"), debug.scannerEngine],
    [t("formats"), debug.supportedFormats.join(", ")],
    [t("lastRaw"), debug.lastDetectedRaw || "-"],
    [t("lastError"), debug.lastError || "-"],
    [t("frames"), String(debug.framesScanned)]
  ];

  return (
    <Card className="border-score-c/25 bg-score-c/5 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-score-c">
        <Bug className="h-4 w-4" /> {t("title")}
      </p>
      <div className="space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[0.9fr_1.1fr] gap-2 text-xs">
            <span className="font-medium text-muted">{label}</span>
            <span className="break-all font-semibold">{value}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">{SUPPORTED_FORMAT_LABELS.join(" / ")}</p>
    </Card>
  );
}
