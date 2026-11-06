"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

export type CamState =
  | "idle"
  | "requesting"
  | "active"
  | "paused"
  | "insecure"
  | "denied"
  | "no-camera"
  | "in-use"
  | "unsupported"
  | "error";

interface Options {
  /** Return true to stop scanning permanently, for example when navigation starts. */
  onDetect: (raw: string, format?: string) => boolean | void;
}

export function classifyCameraError(error: unknown): CamState {
  const name = (error as DOMException | undefined)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no-camera";
  if (name === "NotReadableError" || name === "AbortError") return "in-use";
  if (name === "NotSupportedError") return "unsupported";
  return "error";
}

async function makeReader() {
  const [browser, library] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
  const supportedFormats = [
    browser.BarcodeFormat.EAN_13,
    browser.BarcodeFormat.EAN_8,
    browser.BarcodeFormat.UPC_A,
    browser.BarcodeFormat.UPC_E,
    browser.BarcodeFormat.CODE_128,
    browser.BarcodeFormat.QR_CODE
  ];
  const hints = new Map();
  hints.set(library.DecodeHintType.POSSIBLE_FORMATS, supportedFormats);
  hints.set(library.DecodeHintType.TRY_HARDER, true);
  const reader = new browser.BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 100,
    delayBetweenScanSuccess: 450
  });
  return { reader, BarcodeFormat: browser.BarcodeFormat };
}

type CameraCapabilities = MediaTrackCapabilities & {
  torch?: boolean | boolean[];
  focusMode?: string[];
  zoom?: { min: number; max: number };
};

type CameraSettings = MediaTrackSettings & { torch?: boolean; zoom?: number };

function canToggleTorch(torch: CameraCapabilities["torch"]) {
  return torch === true || (Array.isArray(torch) && torch.includes(true) && torch.includes(false));
}

function zoomRange(zoom: CameraCapabilities["zoom"]) {
  return zoom && Number.isFinite(zoom.min) && Number.isFinite(zoom.max) && zoom.max > zoom.min ? zoom : undefined;
}

function applyCameraSetting(track: MediaStreamTrack, setting: MediaTrackConstraintSet) {
  const constraints = track.getConstraints();
  const keys = Object.keys(setting);
  const keep = (constraints.advanced ?? []).filter((entry) => !keys.some((key) => key in entry));
  return track.applyConstraints({ ...constraints, advanced: [...keep, setting] });
}

function stopTracks(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

export function useBarcodeScanner({ onDetect }: Options) {
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const decoder = useRef<IScannerControls | null>(null);
  const generation = useRef(0);
  const requested = useRef(false);
  const wanted = useRef(false);
  const preferredDevice = useRef<string | undefined>(undefined);
  const lastDetection = useRef({ raw: "", at: 0 });
  const onDetectRef = useRef(onDetect);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  const [state, setState] = useState<CamState>("idle");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>();
  const [capabilities, setCapabilities] = useState<CameraCapabilities>();
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoomValue] = useState<number>();

  const setVideoEl = useCallback((element: HTMLVideoElement | null) => {
    video.current = element;
  }, []);

  const release = useCallback(() => {
    generation.current++;
    requested.current = false;
    decoder.current?.stop();
    decoder.current = null;
    if (stream.current) {
      stopTracks(stream.current);
      const preview = video.current;
      if (preview && preview.srcObject === stream.current) {
        preview.pause();
        preview.srcObject = null;
      }
      stream.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    wanted.current = false;
    release();
    setState("paused");
  }, [release]);

  const start = useCallback(async () => {
    const preview = video.current;
    if (!preview || document.hidden || requested.current) return;
    if (!window.isSecureContext) {
      setState("insecure");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }

    wanted.current = true;
    requested.current = true;
    const request = ++generation.current;
    const isCurrent = () => request === generation.current;
    setState("requesting");
    setCapabilities(undefined);
    setTorchOn(false);
    setZoomValue(undefined);

    try {
      const deviceId = preferredDevice.current;
      const input = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: "environment" } })
        }
      });
      if (!isCurrent()) {
        stopTracks(input);
        return;
      }
      stream.current = input;
      const track = input.getVideoTracks()[0];
      if (!track) throw new DOMException("No video track", "NotFoundError");
      track.addEventListener("ended", () => {
        if (!isCurrent()) return;
        wanted.current = false;
        release();
        setState("in-use");
      }, { once: true });

      const settings = track.getSettings() as CameraSettings;
      const available = track.getCapabilities?.() as CameraCapabilities | undefined;
      setSelectedDeviceId(settings.deviceId ?? deviceId);
      setCapabilities(available);
      setTorchOn(settings.torch === true);
      setZoomValue(settings.zoom);
      if (available?.focusMode?.includes("continuous")) {
        void applyCameraSetting(track, { focusMode: "continuous" } as MediaTrackConstraintSet).catch(() => {});
      }

      void navigator.mediaDevices.enumerateDevices?.().then((all) => {
        if (isCurrent()) setDevices(all.filter((item) => item.kind === "videoinput" && item.deviceId));
      }).catch(() => {});

      const { reader, BarcodeFormat } = await makeReader();
      if (!isCurrent()) return;
      preview.srcObject = input;
      // Keep stream ownership here. Stopping this ZXing decoder only stops decoding.
      const controls = await reader.decodeFromVideoElement(preview, (result) => {
        if (!result || !isCurrent()) return;
        const raw = result.getText().trim();
        const at = Date.now();
        const last = lastDetection.current;
        if (!raw || (last.raw === raw && at - last.at < 1800)) return;
        lastDetection.current = { raw, at };
        if (onDetectRef.current(raw, BarcodeFormat[result.getBarcodeFormat()])) stop();
      });
      if (!isCurrent()) {
        controls.stop();
        return;
      }
      decoder.current = controls;
      setState("active");
    } catch (error) {
      if (!isCurrent()) return;
      wanted.current = false;
      if (classifyCameraError(error) === "no-camera") preferredDevice.current = undefined;
      release();
      setState(classifyCameraError(error));
    }
  }, [release, stop]);

  const retry = useCallback(() => {
    release();
    lastDetection.current = { raw: "", at: 0 };
    void start();
  }, [release, start]);

  const switchCamera = useCallback((deviceId?: string) => {
    const index = devices.findIndex((item) => item.deviceId === selectedDeviceId);
    const next = deviceId ?? devices[(index + 1) % devices.length]?.deviceId;
    if (!next || next === selectedDeviceId) return;
    preferredDevice.current = next;
    retry();
  }, [devices, retry, selectedDeviceId]);

  const toggleTorch = useCallback(async () => {
    const track = stream.current?.getVideoTracks()[0];
    if (!track || !capabilities || !canToggleTorch(capabilities.torch)) return;
    const request = generation.current;
    try {
      await applyCameraSetting(track, { torch: !torchOn } as MediaTrackConstraintSet);
      if (request === generation.current) {
        const actual = (track.getSettings() as CameraSettings).torch;
        if (actual === torchOn) setCapabilities({ ...capabilities, torch: false });
        else setTorchOn(actual ?? !torchOn);
      }
    } catch {
      if (request === generation.current) setCapabilities({ ...capabilities, torch: false });
    }
  }, [capabilities, torchOn]);

  const setZoom = useCallback(async (value: number) => {
    const track = stream.current?.getVideoTracks()[0];
    const range = zoomRange(capabilities?.zoom);
    if (!track || !capabilities || !range) return;
    const request = generation.current;
    const next = Math.max(range.min, Math.min(range.max, value));
    try {
      await applyCameraSetting(track, { zoom: next } as MediaTrackConstraintSet);
      if (request === generation.current) setZoomValue(next);
    } catch {
      if (request === generation.current) setCapabilities({ ...capabilities, zoom: undefined });
    }
  }, [capabilities]);

  useEffect(() => {
    wanted.current = true;
    const timer = setTimeout(() => { void start(); }, 0);
    const suspend = () => {
      if (!wanted.current) return;
      release();
      setState("paused");
    };
    const resume = () => {
      if (wanted.current) void start();
    };
    const visibility = () => document.hidden ? suspend() : resume();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", suspend);
    window.addEventListener("pageshow", resume);
    return () => {
      wanted.current = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", suspend);
      window.removeEventListener("pageshow", resume);
      release();
    };
  }, [release, start]);

  return {
    videoRef: setVideoEl, state, devices, selectedDeviceId,
    torchSupported: canToggleTorch(capabilities?.torch), torchOn,
    zoomSupported: Boolean(zoomRange(capabilities?.zoom)), zoom,
    stop, retry, switchCamera, toggleTorch, setZoom
  };
}
