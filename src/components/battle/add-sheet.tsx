"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { X, ScanLine, Search as SearchIcon, Keyboard, ArrowRight, Plus, Check, Loader2, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductRowSkeleton } from "@/components/ui/skeleton";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { useBarcodeScanner, type CamState } from "@/hooks/use-barcode-scanner";
import { parseProductCode } from "@/lib/utils/parse-scan";
import { getProduct, searchProductsClient } from "@/domains/product/repository";
import { useBattleStore, type AddResult } from "@/domains/battle/store";
import type { Product } from "@/domains/product/model";

type Mode = "search" | "scan" | "manual";

export function AddSheet({ onClose, initialMode = "search" }: { onClose: () => void; initialMode?: "search" | "scan" | "manual" }) {
  const t = useTranslations("battle");
  const add = useBattleStore((s) => s.add);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const flash = (kind: "ok" | "err", text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 2400);
  };

  const handleResult = (r: AddResult, name?: string) => {
    if (r === "added") flash("ok", name || t("add"));
    else if (r === "full") flash("err", t("full"));
    else flash("err", t("alreadyAdded"));
  };

  const addProduct = (p: Product) => handleResult(add(p), p.name);

  const modes: { id: Mode; icon: typeof ScanLine; label: string }[] = [
    { id: "search", icon: SearchIcon, label: t("searchProduct") },
    { id: "scan", icon: ScanLine, label: t("scanProduct") },
    { id: "manual", icon: Keyboard, label: t("manualEntry") }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 w-full max-w-md gc-glass max-h-[88vh] overflow-y-auto rounded-t-3xl p-5 shadow-glass sm:rounded-3xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">{t("addProduct")}</h2>
          <button onClick={onClose} aria-label="close" className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted gc-pressable">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* mode tabs */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {modes.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => setMode(m.id)} data-active={mode === m.id} aria-pressed={mode === m.id}
                className="gc-pressable flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface py-2.5 text-xs font-semibold text-muted data-[active=true]:border-transparent data-[active=true]:bg-deep data-[active=true]:text-white">
                <Icon className="h-5 w-5" /> {m.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {notice && (
            <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              role="status"
              className={`mb-3 rounded-xl px-3 py-2 text-center text-sm font-medium ${notice.kind === "ok" ? "bg-natural/10 text-natural" : "bg-score-d/10 text-score-d"}`}>
              {notice.kind === "ok" ? `✓ ${notice.text}` : notice.text}
            </motion.p>
          )}
        </AnimatePresence>

        {mode === "search" && <SearchTab onAdd={addProduct} />}
        {mode === "manual" && <ManualTab onResolve={(r, n) => handleResult(r, n)} add={add} />}
        {mode === "scan" && <ScanTab onResolve={(r, n) => handleResult(r, n)} add={add} />}
      </motion.div>
    </div>
  );
}

/* ── search ── */
function SearchTab({ onAdd }: { onAdd: (p: Product) => void }) {
  const t = useTranslations("battle");
  const has = useBattleStore((s) => s.has);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ok">("idle");
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(debounce.current);
    const query = q.trim();
    // Defer all state updates into timers so none run synchronously in the
    // effect body (react-hooks/set-state-in-effect).
    if (query.length < 2) {
      debounce.current = setTimeout(() => { setItems([]); setStatus("idle"); }, 0);
      return () => clearTimeout(debounce.current);
    }
    debounce.current = setTimeout(async () => {
      setStatus("loading");
      try { const d = await searchProductsClient(query); setItems(d.products); setStatus("ok"); }
      catch { setItems([]); setStatus("ok"); }
    }, 400);
    return () => clearTimeout(debounce.current);
  }, [q]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3">
        <SearchIcon className="h-5 w-5 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPlaceholder")} autoFocus className="h-11 flex-1 bg-transparent text-sm outline-none" />
      </div>
      {status === "loading" && <div className="space-y-2"><ProductRowSkeleton /><ProductRowSkeleton /></div>}
      {status === "ok" && items.length === 0 && <p className="py-6 text-center text-sm text-muted">{t("noResults")}</p>}
      <div className="space-y-2">
        {items.slice(0, 12).map((p) => {
          const inBattle = has(p.barcode);
          return (
            <div key={p.barcode} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                { }
                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain" loading="lazy" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {p.nutriScore && <NutriScoreBadge grade={p.nutriScore} variant="compact" className="h-4 w-4 rounded text-[0.55rem]" />}
                  <span className="truncate text-xs text-muted">{p.brand || "—"}</span>
                </div>
              </div>
              <Button size="icon" variant={inBattle ? "soft" : "neon"} aria-label="add" onClick={() => onAdd(p)} disabled={inBattle}>
                {inBattle ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── manual ── */
function ManualTab({ onResolve, add }: { onResolve: (r: AddResult, n?: string) => void; add: (p: Product) => AddResult }) {
  const t = useTranslations("battle");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    const c = code.replace(/\D/g, "");
    if (c.length < 8) return;
    setBusy(true); setErr(null);
    try {
      const res = await getProduct(c);
      if (res.status === "not_found") setErr(t("notFound"));
      else { onResolve(add(res.product), res.product.name); setCode(""); }
    } catch { setErr(t("errorFetch")); }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 14))} onKeyDown={(e) => e.key === "Enter" && submit()}
          inputMode="numeric" placeholder={t("manualPlaceholder")} className="h-11 flex-1 rounded-2xl border border-line bg-surface px-4 text-sm outline-none focus:ring-2 focus:ring-neon/50" />
        <Button variant="neon" size="icon" disabled={code.replace(/\D/g, "").length < 8 || busy} onClick={submit} aria-label={t("add")}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5 rtl:rotate-180" />}
        </Button>
      </div>
      {err && <p className="text-center text-sm font-medium text-score-d">{err}</p>}
    </div>
  );
}

/* ── scan (reuses the shared scanner hook) ── */
function ScanTab({ onResolve, add }: { onResolve: (r: AddResult, n?: string) => void; add: (p: Product) => AddResult }) {
  const t = useTranslations("battle");
  const scanT = useTranslations("scan");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const blockedStates: CamState[] = ["insecure", "denied", "no-camera", "in-use", "unsupported", "error"];

  const { videoRef, state, devices, retry, switchCamera } = useBarcodeScanner({
    onDetect: (raw) => {
      const code = parseProductCode(raw);
      if (!code) {
        setErr(scanT("unsupportedCode"));
        return false;
      }
      setBusy(true);
      setErr(null);
      getProduct(code)
        .then((res) => {
          if (res.status === "not_found") setErr(t("notFound"));
          else onResolve(add(res.product), res.product.name);
        })
        .catch(() => setErr(t("errorFetch")))
        .finally(() => setBusy(false));
      return true;
    }
  });

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-deep-grad">
        <video ref={videoRef} className={`absolute inset-0 h-full w-full object-cover ${state === "active" ? "opacity-100" : "opacity-0"}`} muted playsInline autoPlay aria-hidden />
        {state === "active" && <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-neon/60 shadow-glow" />}
        {state === "active" && (
          <p className="absolute inset-x-4 bottom-4 rounded-2xl bg-black/45 px-3 py-2 text-center text-xs font-medium text-white/80 backdrop-blur">
            {scanT("scanGuidance")}
          </p>
        )}
        {blockedStates.includes(state) && (
          <div className="absolute inset-0 grid place-items-center p-4 text-center text-white/80">
            <div className="flex flex-col items-center gap-2">
              <CameraOff className="h-7 w-7" />
              <span className="text-sm">
                {state === "insecure"
                  ? scanT("httpsRequiredTitle")
                  : state === "denied"
                    ? scanT("cameraDenied")
                    : state === "no-camera"
                      ? scanT("noCameraFound")
                      : state === "in-use"
                        ? scanT("cameraInUse")
                        : scanT("cameraUnsupported")}
              </span>
              <Button variant="neon" size="sm" onClick={retry}>
                {scanT("retry")}
              </Button>
            </div>
          </div>
        )}
        {busy && <div className="absolute inset-0 grid place-items-center bg-deep/40"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>}
      </div>
      {devices.length > 1 && (
        <Button variant="soft" size="sm" className="w-full" onClick={() => switchCamera()}>
          {scanT("switchCamera")}
        </Button>
      )}
      {err && <p className="text-center text-sm font-medium text-score-d">{err}</p>}
    </div>
  );
}
