"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type CamState = "idle" | "requesting" | "active" | "denied" | "unsupported" | "error";

// Detect linear barcodes AND 2D/QR codes together — the UI toggle is purely visual framing.
const FORMATS = [
  "ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "codabar",
  "qr_code", "data_matrix", "aztec", "pdf417"
];

interface DetectedCode {
  rawValue: string;
  format?: string;
}
type Detector = { detect: (s: CanvasImageSource) => Promise<DetectedCode[]> };

// Set the self-hosted wasm override only once per session.
let zxingOverridden = false;

async function createDetector(): Promise<Detector | null> {
  if (typeof window === "undefined") return null;
  const G = window as unknown as { BarcodeDetector?: any };

  // 1) Native BarcodeDetector (Chrome, Edge, Android WebView) — fastest, zero download.
  if (G.BarcodeDetector) {
    try {
      const supported: string[] = (await G.BarcodeDetector.getSupportedFormats?.()) ?? [];
      const formats = FORMATS.filter((f) => supported.includes(f));
      if (formats.length) return new G.BarcodeDetector({ formats });
    } catch {
      /* fall through to bundled fallback */
    }
  }

  // 2) Cross-browser fallback (Safari/iOS, Firefox) via `barcode-detector` (zxing-wasm).
  //    PRIVACY-FIRST: zxing-wasm's default `locateFile` fetches `zxing_full.wasm` from a
  //    public CDN (fastly.jsdelivr.net) at runtime. We override it to load the binary from
  //    our OWN origin (/wasm/zxing_full.wasm, copied by scripts/copy-wasm.mjs at build).
  //    No third-party runtime code is ever fetched.
  try {
    const mod = await import("barcode-detector/pure");
    if (!zxingOverridden) {
      mod.setZXingModuleOverrides({
        locateFile: (path: string, prefix: string) =>
          path.endsWith(".wasm") ? `/wasm/${path}` : `${prefix}${path}`
      });
      zxingOverridden = true;
    }
    return new mod.BarcodeDetector({ formats: FORMATS as any });
  } catch {
    return null;
  }
}

interface Options {
  /** Return true to stop scanning permanently (e.g. valid product → navigate). */
  onDetect: (raw: string, format?: string) => boolean | void;
}

export function useBarcodeScanner({ onDetect }: Options) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<Detector | null>(null);
  const rafRef = useRef<number>();

  const mountedRef = useRef(true);
  const finishedRef = useRef(false); // latch: once handled, never scan/restart again
  const lastRaw = useRef<string>("");
  const lastRawAt = useRef(0);
  const lastDecodeAt = useRef(0);

  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  const [state, setState] = useState<CamState>("idle");

  /** Fully release camera + cancel the detection loop. Idempotent. */
  const stopStream = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => {
        try { t.stop(); } catch { /* noop */ }
      });
      streamRef.current = null;
    }
    const v = videoRef.current;
    if (v) {
      try { v.pause(); } catch { /* noop */ }
      v.srcObject = null;
    }
  }, []);

  const loop = useCallback(() => {
    const run = async (ts: number) => {
      if (!mountedRef.current || finishedRef.current) return;
      const v = videoRef.current;
      const d = detectorRef.current;
      if (!v || !d) return;

      // Throttle decoding (~6 fps) — keeps the UI smooth and CPU low.
      if (ts - lastDecodeAt.current > 160 && v.readyState >= 2) {
        lastDecodeAt.current = ts;
        try {
          const codes = await d.detect(v);
          const raw = codes?.[0]?.rawValue;
          if (raw && !finishedRef.current) {
            const isDuplicate = raw === lastRaw.current && ts - lastRawAt.current < 2000;
            if (!isDuplicate) {
              lastRaw.current = raw;
              lastRawAt.current = ts;
              const handled = onDetectRef.current(raw, codes[0].format);
              if (handled) {
                // Single-fire: latch, buzz once, release camera immediately. No reschedule.
                finishedRef.current = true;
                if (typeof navigator !== "undefined") navigator.vibrate?.(45);
                stopStream();
                return;
              }
            }
          }
        } catch {
          /* transient decode error — keep scanning */
        }
      }
      if (mountedRef.current && !finishedRef.current) {
        rafRef.current = requestAnimationFrame(run);
      }
    };
    rafRef.current = requestAnimationFrame(run);
  }, [stopStream]);

  const start = useCallback(async () => {
    if (finishedRef.current) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      // Guard against unmount/finish during the async permission prompt.
      if (!mountedRef.current || finishedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      detectorRef.current = await createDetector();
      if (!detectorRef.current) {
        stopStream();
        setState("unsupported");
        return;
      }
      if (!mountedRef.current || finishedRef.current) {
        stopStream();
        return;
      }
      setState("active");
      loop();
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") setState("denied");
      else if (name === "NotFoundError" || name === "OverconstrainedError") setState("unsupported");
      else setState("error");
    }
  }, [loop, stopStream]);

  /** Explicit full stop for callers (e.g. before navigating away). */
  const stop = useCallback(() => {
    finishedRef.current = true;
    stopStream();
  }, [stopStream]);

  /** Reset the latch and try again (used by "retry" after denied/error). */
  const retry = useCallback(() => {
    finishedRef.current = false;
    lastRaw.current = "";
    start();
  }, [start]);

  // Mount: start once. Unmount: tear everything down (no background camera, no leaks).
  useEffect(() => {
    mountedRef.current = true;
    start();
    return () => {
      mountedRef.current = false;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Never keep the camera live while the tab/app is backgrounded.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        stopStream();
      } else if (!finishedRef.current && mountedRef.current) {
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [start, stopStream]);

  return { videoRef, state, stop, retry };
}
