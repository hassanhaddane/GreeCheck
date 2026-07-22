"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, X } from "lucide-react";

export function PwaRegister() {
  const t = useTranslations("pwa");
  const tc = useTranslations("common");
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const reloading = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    const onControllerChange = () => {
      if (!reloading.current) return;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    /**
     * Obsolete-cache recovery. After a deployment, a cached shell can reference
     * chunks that no longer exist; the app would then fail to hydrate a route.
     * On such a failure we ask the worker to drop every cache and reload ONCE
     * (a single ephemeral session flag guards against reload loops).
     */
    const RECOVERY_FLAG = "gc.cacheRecovery";
    const onCachesCleared = (event: MessageEvent) => {
      if (event.data === "CACHES_CLEARED") window.location.reload();
    };
    navigator.serviceWorker.addEventListener("message", onCachesCleared);

    const looksLikeStaleChunk = (message: string) =>
      /ChunkLoadError|Loading chunk .* failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(message);

    const recover = (message: string) => {
      if (!looksLikeStaleChunk(message)) return;
      try {
        if (sessionStorage.getItem(RECOVERY_FLAG)) return; // already tried this session
        sessionStorage.setItem(RECOVERY_FLAG, "1");
      } catch { /* storage unavailable — attempt recovery anyway */ }
      navigator.serviceWorker.controller?.postMessage("CLEAR_CACHES");
    };
    const onError = (e: ErrorEvent) => recover(e.message ?? "");
    const onRejection = (e: PromiseRejectionEvent) => recover(String((e.reason as Error)?.message ?? e.reason ?? ""));
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    void navigator.serviceWorker.register("/sw.js").then((registration) => {
      if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
        });
      });
    }).catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      navigator.serviceWorker.removeEventListener("message", onCachesCleared);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (!waiting) return null;

  const applyUpdate = () => {
    reloading.current = true;
    waiting.postMessage("SKIP_WAITING");
  };

  return (
    <aside className="fixed inset-x-4 bottom-28 z-50 mx-auto max-w-md rounded-3xl border border-natural/25 bg-surface p-4 shadow-raised md:bottom-6" role="status">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-natural/10 text-natural-strong">
          <RefreshCw className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t("updateTitle")}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{t("updateBody")}</p>
          <button onClick={applyUpdate} className="mt-2 min-h-11 rounded-2xl bg-deep px-4 text-xs font-semibold text-white">
            {t("updateAction")}
          </button>
        </div>
        <button onClick={() => setWaiting(null)} aria-label={tc("dismiss")} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-muted hover:bg-surface-2">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
