"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarcodeFormat,
  BrowserMultiFormatReader,
  type IScannerControls
} from "@zxing/browser";
import { DecodeHintType, NotFoundException } from "@zxing/library";

export type CamState =
  | "idle"
  | "checking"
  | "requesting"
  | "active"
  | "paused"
  | "insecure"
  | "denied"
  | "no-camera"
  | "in-use"
  | "unsupported"
  | "error";

export type CameraPermissionState = "unknown" | "prompt" | "granted" | "denied" | "unsupported";

export interface ScannerEnvironment {
  secureContext: boolean;
  mediaDevices: boolean;
  getUserMedia: boolean;
}

interface Options {
  /** Return true to stop scanning permanently, for example when navigation starts. */
  onDetect: (raw: string, format?: string) => boolean | void;
}

const SUPPORTED_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.QR_CODE
];

export const SUPPORTED_FORMAT_LABELS = ["EAN_13", "EAN_8", "UPC_A", "UPC_E", "CODE_128", "QR_CODE"];
const VIDEO_TRACKS = (track: MediaStreamTrack) => (track.kind === "video" ? [track] : []);

type ExtendedCapabilities = MediaTrackCapabilities & {
  torch?: boolean;
  focusMode?: string[];
  exposureMode?: string[];
  zoom?: { min?: number; max?: number; step?: number } | number;
};

type ExtendedConstraints = MediaTrackConstraints & {
  advanced?: Array<Record<string, unknown>>;
  torch?: boolean;
  focusMode?: string;
  exposureMode?: string;
  zoom?: number;
};

type ExtendedSettings = MediaTrackSettings & {
  zoom?: number;
};

function environment(): ScannerEnvironment {
  const mediaDevices = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices);
  return {
    secureContext: typeof window !== "undefined" ? window.isSecureContext : false,
    mediaDevices,
    getUserMedia: mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function"
  };
}

function classifyCameraError(error: unknown): CamState {
  const name = (error as DOMException | undefined)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no-camera";
  if (name === "NotReadableError" || name === "AbortError") return "in-use";
  if (name === "NotSupportedError") return "unsupported";
  return "error";
}

function cameraSortScore(device: MediaDeviceInfo, index: number): number {
  const label = device.label.toLowerCase();
  let score = 100 - index;
  if (/\bback\b|rear|environment|world|main/.test(label)) score += 80;
  if (/wide|ultra|0\.5|macro|depth|tele/.test(label)) score -= 30;
  if (/front|face|user|selfie|frontal/.test(label)) score -= 60;
  return score;
}

function chooseDefaultDevice(devices: MediaDeviceInfo[]): string | undefined {
  if (!devices.length) return undefined;
  return [...devices].sort((a, b) => cameraSortScore(b, devices.indexOf(b)) - cameraSortScore(a, devices.indexOf(a)))[0]?.deviceId;
}

async function readPermission(): Promise<CameraPermissionState> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unknown";
  try {
    const status = await navigator.permissions.query({ name: "camera" as PermissionName });
    return status.state as CameraPermissionState;
  } catch {
    return "unsupported";
  }
}

function makeReader(): BrowserMultiFormatReader {
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 100,
    delayBetweenScanSuccess: 450
  });
}

function constraintsForDevice(deviceId?: string): MediaStreamConstraints {
  const video: ExtendedConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    advanced: [
      { focusMode: "continuous" },
      { exposureMode: "continuous" }
    ]
  };

  if (deviceId) {
    video.deviceId = { exact: deviceId };
  } else {
    video.facingMode = { ideal: "environment" };
  }

  return { audio: false, video };
}

function getCapabilities(controls: IScannerControls | null): ExtendedCapabilities | null {
  try {
    return (controls?.streamVideoCapabilitiesGet?.(VIDEO_TRACKS) as ExtendedCapabilities | undefined) ?? null;
  } catch {
    return null;
  }
}

function getSettings(controls: IScannerControls | null): ExtendedSettings | null {
  try {
    return (controls?.streamVideoSettingsGet?.(VIDEO_TRACKS) as ExtendedSettings | undefined) ?? null;
  } catch {
    return null;
  }
}

function applyContinuousCameraConstraints(controls: IScannerControls | null) {
  const capabilities = getCapabilities(controls);
  const advanced: Array<Record<string, unknown>> = [];
  if (capabilities?.focusMode?.includes("continuous")) advanced.push({ focusMode: "continuous" });
  if (capabilities?.exposureMode?.includes("continuous")) advanced.push({ exposureMode: "continuous" });
  if (!advanced.length) return;

  try {
    controls?.streamVideoConstraintsApply?.({ advanced } as ExtendedConstraints, VIDEO_TRACKS);
  } catch {
    /* Some browsers expose capabilities but reject the constraint. Scanning can continue. */
  }
}

export function useBarcodeScanner({ onDetect }: Options) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const mountedRef = useRef(true);
  const finishedRef = useRef(false);
  const startingRef = useRef(false);
  const lastRawRef = useRef("");
  const lastRawAtRef = useRef(0);
  const selectedDeviceRef = useRef<string | undefined>(undefined);

  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  const env = useMemo(environment, []);
  const [state, setState] = useState<CamState>("idle");
  const [permission, setPermission] = useState<CameraPermissionState>("unknown");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>();
  const [selectedCameraLabel, setSelectedCameraLabel] = useState("");
  // Internal-only signals (no debug UI): values are intentionally not exposed.
  const [, setLastDetectedRaw] = useState("");
  const [, setLastError] = useState("");
  const [, setFramesScanned] = useState(0);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoom, setZoomValue] = useState<number | undefined>();

  const stopStream = useCallback(() => {
    try {
      controlsRef.current?.stop();
    } catch {
      /* noop */
    }
    controlsRef.current = null;
    readerRef.current = null;
    setTorchOn(false);
    setTorchSupported(false);
    setZoomSupported(false);
    setZoomValue(undefined);

    const video = videoRef.current;
    const stream = video?.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          /* noop */
        }
      });
    }
    if (video) {
      try {
        video.pause();
      } catch {
        /* noop */
      }
      video.srcObject = null;
    }
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!env.mediaDevices) {
      setDevices([]);
      return [];
    }
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const cameras = list.filter((device) => device.kind === "videoinput");
      setDevices(cameras);
      if (!selectedDeviceRef.current) {
        const preferred = chooseDefaultDevice(cameras);
        selectedDeviceRef.current = preferred;
        setSelectedDeviceId(preferred);
      }
      const selected = cameras.find((device) => device.deviceId === selectedDeviceRef.current) ?? cameras[0];
      setSelectedCameraLabel(selected?.label || "");
      return cameras;
    } catch (error) {
      setLastError((error as Error)?.message || "enumerateDevices failed");
      setDevices([]);
      return [];
    }
  }, [env.mediaDevices]);

  const start = useCallback(async () => {
    if (finishedRef.current || startingRef.current) return;
    setState("checking");
    setLastError("");

    const currentEnv = environment();
    if (!currentEnv.secureContext) {
      setState("insecure");
      return;
    }
    if (!currentEnv.mediaDevices || !currentEnv.getUserMedia) {
      setState("unsupported");
      return;
    }
    if (!videoRef.current) return;

    startingRef.current = true;
    setState("requesting");
    setPermission(await readPermission());

    try {
      const reader = makeReader();
      readerRef.current = reader;
      await refreshDevices();
      const controls = await reader.decodeFromConstraints(
        constraintsForDevice(selectedDeviceRef.current),
        videoRef.current,
        (result, error) => {
          if (!mountedRef.current || finishedRef.current) return;
          setFramesScanned((count) => count + 1);

          if (result) {
            const raw = result.getText().trim();
            const format = BarcodeFormat[result.getBarcodeFormat()];
            const now = Date.now();
            setLastDetectedRaw(raw);

            if (raw && !(raw === lastRawRef.current && now - lastRawAtRef.current < 1800)) {
              lastRawRef.current = raw;
              lastRawAtRef.current = now;
              const handled = onDetectRef.current(raw, format);
              if (handled) {
                finishedRef.current = true;
                navigator.vibrate?.(45);
                stopStream();
                setState("paused");
              }
            }
            return;
          }

          if (error && !(error instanceof NotFoundException)) {
            setLastError(error.message || error.name || "Decode error");
          }
        }
      );

      if (!mountedRef.current || finishedRef.current) {
        controls.stop();
        return;
      }

      controlsRef.current = controls;
      applyContinuousCameraConstraints(controls);
      const capabilities = getCapabilities(controls);
      const settings = getSettings(controls);
      setTorchSupported(Boolean(capabilities?.torch && controls.switchTorch));
      setZoomSupported(Boolean(capabilities?.zoom));
      setZoomValue(typeof settings?.zoom === "number" ? settings.zoom : undefined);
      await refreshDevices();
      setPermission(await readPermission());
      setState("active");
    } catch (error) {
      stopStream();
      const next = classifyCameraError(error);
      setState(next);
      setLastError((error as Error)?.message || next);
      setPermission(next === "denied" ? "denied" : await readPermission());
    } finally {
      startingRef.current = false;
    }
  }, [refreshDevices, stopStream]);

  const stop = useCallback(() => {
    finishedRef.current = true;
    stopStream();
    setState("paused");
  }, [stopStream]);

  const pause = useCallback(() => {
    if (state !== "active") return;
    stopStream();
    setState("paused");
  }, [state, stopStream]);

  const resume = useCallback(() => {
    if (finishedRef.current) return;
    start();
  }, [start]);

  const retry = useCallback(() => {
    finishedRef.current = false;
    lastRawRef.current = "";
    lastRawAtRef.current = 0;
    setFramesScanned(0);
    setLastDetectedRaw("");
    setLastError("");
    stopStream();
    start();
  }, [start, stopStream]);

  const switchCamera = useCallback(async (deviceId?: string) => {
    if (!devices.length) return;
    const currentIndex = Math.max(0, devices.findIndex((device) => device.deviceId === (deviceId ?? selectedDeviceRef.current)));
    const nextDevice = deviceId
      ? devices.find((device) => device.deviceId === deviceId)
      : devices[(currentIndex + 1) % devices.length];
    if (!nextDevice) return;

    selectedDeviceRef.current = nextDevice.deviceId;
    setSelectedDeviceId(nextDevice.deviceId);
    setSelectedCameraLabel(nextDevice.label || "");
    finishedRef.current = false;
    lastRawRef.current = "";
    stopStream();
    start();
  }, [devices, start, stopStream]);

  const toggleTorch = useCallback(async () => {
    if (!torchSupported || !controlsRef.current?.switchTorch) return;
    const next = !torchOn;
    try {
      await controlsRef.current.switchTorch(next);
      setTorchOn(next);
    } catch (error) {
      setLastError((error as Error)?.message || "Torch unavailable");
      setTorchSupported(false);
    }
  }, [torchOn, torchSupported]);

  const setZoom = useCallback((value: number) => {
    const controls = controlsRef.current;
    const capabilities = getCapabilities(controls);
    if (!controls || !capabilities?.zoom) return;
    const zoomCapability = capabilities.zoom;
    const min = typeof zoomCapability === "object" ? zoomCapability.min ?? 1 : 1;
    const max = typeof zoomCapability === "object" ? zoomCapability.max ?? 4 : Number(zoomCapability);
    const next = Math.max(min, Math.min(max, value));
    try {
      controls.streamVideoConstraintsApply?.({ advanced: [{ zoom: next }] } as ExtendedConstraints, VIDEO_TRACKS);
      setZoomValue(next);
    } catch (error) {
      setLastError((error as Error)?.message || "Zoom unavailable");
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    start();
    return () => {
      mountedRef.current = false;
      stopStream();
    };
  }, [start, stopStream]);

  useEffect(() => {
    if (!env.mediaDevices) return;
    navigator.mediaDevices.addEventListener?.("devicechange", refreshDevices);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", refreshDevices);
  }, [env.mediaDevices, refreshDevices]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        if (!finishedRef.current) {
          stopStream();
          setState("paused");
        }
      } else if (!finishedRef.current && mountedRef.current) {
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [start, stopStream]);

  return {
    videoRef,
    state,
    env,
    permission,
    devices,
    selectedDeviceId,
    selectedCameraLabel,
    torchSupported,
    torchOn,
    zoomSupported,
    zoom,
    stop,
    pause,
    resume,
    retry,
    switchCamera,
    toggleTorch,
    setZoom
  };
}
