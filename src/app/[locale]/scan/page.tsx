"use client";
import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, QrCode, Keyboard, ArrowRight, CameraOff, Camera, RotateCw, Search, ShieldCheck } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScanOverlay } from "@/components/scan/scan-overlay";
import type { ScanMode } from "@/components/scan/scan-frame-shape";
import { useBarcodeScanner, type CamState } from "@/hooks/use-barcode-scanner";
import { parseScan } from "@/lib/utils/parse-scan";

const VALID_BARCODE = /^\d{8,14}$/;

export default function ScanPage() {
  const t = useTranslations("scan");
  const router = useRouter();
  const [mode, setMode] = useState<ScanMode>("barcode");
  const [detected, setDetected] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleDetect = useCallback(
    (raw: string) => {
      const parsed = parseScan(raw);
      if (parsed.type === "barcode" && VALID_BARCODE.test(parsed.code)) {
        setDetected(true);
        // hook has already stopped the camera; navigate after the success beat.
        setTimeout(() => router.push(`/product/${parsed.code}`), 850);
        return true; // stop scanning permanently
      }
      // QR/text that isn't a valid product code → transient warning, keep scanning.
      clearTimeout(noticeTimer.current);
      setNotice(t("notAProduct"));
      noticeTimer.current = setTimeout(() => setNotice(null), 2800);
      return false;
    },
    [router, t]
  );

  const { videoRef, state, stop, retry } = useBarcodeScanner({ onDetect: handleDetect });

  const manualValid = VALID_BARCODE.test(manual);
  const goManual = () => {
    if (!manualValid) return;
    stop();
    router.push(`/product/${manual}`);
  };

  const modes: { id: ScanMode; icon: typeof ScanLine }[] = [
    { id: "barcode", icon: ScanLine },
    { id: "qr", icon: QrCode }
  ];

  // Screen-reader status text per state.
  const statusText: Record<CamState | "detected", string> = {
    idle: "",
    requesting: t("requesting"),
    active: t("scanningStatus"),
    denied: t("cameraDenied"),
    unsupported: t("cameraUnsupported"),
    error: t("cameraUnsupported"),
    detected: t("analyzing")
  };
  const liveStatus = detected ? statusText.detected : statusText[state];

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="flex items-center justify-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-neon-grad text-deep shadow-glow" aria-hidden>
          <ScanLine className="h-4 w-4" />
        </span>
        <h1 className="text-xl font-bold tracking-tight gc-gradient-text">{t("title")}</h1>
      </div>

      {/* Polite live region for assistive tech */}
      <p className="sr-only" role="status" aria-live="polite">{liveStatus}</p>

      {/* Camera viewport */}
      <Card
        className="relative aspect-[3/4] overflow-hidden bg-deep-grad p-0"
        role="region"
        aria-label={t("title")}
      >
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
          <p className="absolute inset-x-0 bottom-6 text-center text-sm font-medium text-white/85">{t("instruction")}</p>
        )}

        <AnimatePresence>
          {detected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-2 text-sm font-semibold text-neon"
            >
              <span className="h-2 w-2 animate-ping rounded-full bg-neon" aria-hidden />
              {t("analyzing")}
            </motion.div>
          )}
        </AnimatePresence>

        {/* requesting camera */}
        {state === "requesting" && (
          <div className="absolute inset-0 grid place-items-center text-white/75">
            <div className="flex flex-col items-center gap-2">
              <Camera className="h-6 w-6 animate-pulse" aria-hidden />
              <span className="text-sm">{t("requesting")}</span>
            </div>
          </div>
        )}

        {/* denied */}
        {state === "denied" && (
          <PermissionPanel
            icon={<CameraOff className="h-7 w-7" />}
            title={t("cameraDenied")}
            body={t("cameraDeniedHelp")}
            action={<Button variant="neon" size="sm" onClick={retry}><RotateCw className="h-4 w-4" aria-hidden /> {t("retry")}</Button>}
          />
        )}

        {/* unsupported / error */}
        {(state === "unsupported" || state === "error") && (
          <PermissionPanel
            icon={<CameraOff className="h-7 w-7" />}
            title={t("cameraUnsupported")}
            body={t("cameraUnsupportedHelp")}
            action={
              state === "error" ? (
                <Button variant="neon" size="sm" onClick={retry}><RotateCw className="h-4 w-4" aria-hidden /> {t("retry")}</Button>
              ) : undefined
            }
          />
        )}

        {/* transient notice (non-product QR) */}
        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="absolute inset-x-4 top-4 rounded-2xl bg-black/55 px-4 py-2.5 text-center text-sm text-white backdrop-blur"
            >
              {notice}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Privacy note */}
      <p className="flex items-center justify-center gap-1.5 px-2 text-center text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-natural" aria-hidden />
        {t("privacyNote")}
      </p>

      {/* Mode switch */}
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

      {/* Manual fallback */}
      <Card className="p-4">
        <label htmlFor="manual-barcode" className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <Keyboard className="h-3.5 w-3.5" aria-hidden /> {t("manual")}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="manual-barcode"
            value={manual}
            onChange={(e) => setManual(e.target.value.replace(/\D/g, "").slice(0, 14))}
            onKeyDown={(e) => e.key === "Enter" && goManual()}
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={manual.length > 0 && !manualValid}
            placeholder={t("manualPlaceholder")}
            className="h-11 flex-1 rounded-2xl border border-line bg-surface-2 px-4 text-sm outline-none focus:ring-2 focus:ring-neon/50"
          />
          <Button variant="neon" size="icon" disabled={!manualValid} onClick={goManual} aria-label={t("manual")}>
            <ArrowRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
          </Button>
        </div>
        <button
          type="button"
          onClick={() => { stop(); router.push("/search"); }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-1 text-sm font-medium text-natural focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/60"
        >
          <Search className="h-4 w-4" aria-hidden /> {t("searchInstead")}
        </button>
      </Card>
    </div>
  );
}

function PermissionPanel({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-6">
      <div className="flex flex-col items-center gap-3 text-center text-white">
        <span className="grid h-16 w-16 place-items-center rounded-3xl bg-white/10 backdrop-blur" aria-hidden>{icon}</span>
        <p className="font-semibold">{title}</p>
        <p className="max-w-xs text-sm text-white/70">{body}</p>
        {action}
      </div>
    </div>
  );
}
