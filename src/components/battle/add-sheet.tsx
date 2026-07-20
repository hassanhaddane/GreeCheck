"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, Search as SearchIcon, Keyboard, ArrowRight, Plus, Check, Loader2, CameraOff, Library, History, Heart, ShoppingBasket } from "lucide-react";
import { GreeButton } from "@/components/system/gree-button";
import { GreeBottomSheet } from "@/components/system/gree-bottom-sheet";
import { ProductRowSkeleton } from "@/components/system/loading-state";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { NutriScoreBadge } from "@/components/badges/nutri-score-badge";
import { useBarcodeScanner, type CamState } from "@/hooks/use-barcode-scanner";
import { parseProductCode } from "@/lib/utils/parse-scan";
import { getProduct, searchProductsClient } from "@/domains/product/repository";
import { useBattleStore, type AddResult } from "@/domains/battle/store";
import { useHistoryStore } from "@/domains/library/history-store";
import { useFavoritesStore } from "@/domains/library/favorites-store";
import { useCartStore } from "@/domains/cart/store";
import type { Product } from "@greecheck/domain/product/model";

type Mode = "search" | "scan" | "manual" | "library";
export type AddSheetMode = Mode;

export function AddSheet({ onClose, initialMode = "search" }: { onClose: () => void; initialMode?: AddSheetMode }) {
  const t = useTranslations("battle");
  const tc = useTranslations("common");
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
    { id: "library", icon: Library, label: t("fromLibrary") },
    { id: "manual", icon: Keyboard, label: t("manualEntry") }
  ];

  return (
    <GreeBottomSheet open onClose={onClose} title={t("addProduct")} closeLabel={tc("close")}>
        {/* source tabs */}
        <div className="mb-4 grid grid-cols-4 gap-2">
          {modes.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => setMode(m.id)} data-active={mode === m.id} aria-pressed={mode === m.id}
                className="gc-pressable flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface py-2.5 text-[0.7rem] font-semibold text-muted data-[active=true]:border-transparent data-[active=true]:bg-deep data-[active=true]:text-white">
                <Icon className="h-5 w-5" /> {m.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {notice && (
            <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              role="status"
              className={`mb-3 rounded-xl px-3 py-2 text-center text-sm font-medium ${notice.kind === "ok" ? "bg-natural/10 text-natural-strong" : "bg-score-d/10 text-score-d-ink"}`}>
              {notice.kind === "ok" ? `✓ ${notice.text}` : notice.text}
            </motion.p>
          )}
        </AnimatePresence>

        {mode === "search" && <SearchTab onAdd={addProduct} />}
        {mode === "manual" && <ManualTab onResolve={(r, n) => handleResult(r, n)} add={add} />}
        {mode === "scan" && <ScanTab onResolve={(r, n) => handleResult(r, n)} add={add} />}
        {mode === "library" && <LibraryTab onResolve={(r, n) => handleResult(r, n)} add={add} onAdd={addProduct} />}
    </GreeBottomSheet>
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
              <ProductThumbnail src={p.imageUrl} alt={p.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {p.nutriScore && <NutriScoreBadge grade={p.nutriScore} variant="compact" className="h-4 w-4 rounded text-[0.55rem]" />}
                  <span className="truncate text-xs text-muted">{p.brand || "—"}</span>
                </div>
              </div>
              <GreeButton size="icon" variant={inBattle ? "soft" : "neon"} aria-label={t("add")} onClick={() => onAdd(p)} disabled={inBattle}>
                {inBattle ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </GreeButton>
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
      if (res.kind === "product") { onResolve(add(res.product), res.product.name); setCode(""); }
      else if (res.kind === "not_found") setErr(t("notFound"));
      else setErr(t("errorFetch"));
    } catch { setErr(t("errorFetch")); }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 14))} onKeyDown={(e) => e.key === "Enter" && submit()}
          inputMode="numeric" placeholder={t("manualPlaceholder")} className="h-11 flex-1 rounded-2xl border border-line bg-surface px-4 text-sm outline-none focus:ring-2 focus:ring-neon/50" />
        <GreeButton variant="neon" size="icon" disabled={code.replace(/\D/g, "").length < 8 || busy} onClick={submit} aria-label={t("add")}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5 rtl:rotate-180" />}
        </GreeButton>
      </div>
      {err && <p className="text-center text-sm font-medium text-score-d-ink">{err}</p>}
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
          if (res.kind === "product") onResolve(add(res.product), res.product.name);
          else if (res.kind === "not_found") setErr(t("notFound"));
          else setErr(t("errorFetch"));
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
              <GreeButton variant="neon" size="sm" onClick={retry}>
                {scanT("retry")}
              </GreeButton>
            </div>
          </div>
        )}
        {busy && <div className="absolute inset-0 grid place-items-center bg-deep/40"><Loader2 className="h-6 w-6 animate-spin text-neon" /></div>}
      </div>
      {devices.length > 1 && (
        <GreeButton variant="soft" size="sm" className="w-full" onClick={() => switchCamera()}>
          {scanT("switchCamera")}
        </GreeButton>
      )}
      {err && <p className="text-center text-sm font-medium text-score-d-ink">{err}</p>}
    </div>
  );
}

/* ── library: Mes scans · Favorites · GreeCart ── */
type Source = "history" | "favorites" | "cart";
interface LocalRow { barcode: string; name: string; imageUrl?: string; score?: number; product?: Product }

function LibraryTab({ onResolve, add, onAdd }: { onResolve: (r: AddResult, n?: string) => void; add: (p: Product) => AddResult; onAdd: (p: Product) => void }) {
  const t = useTranslations("battle");
  const has = useBattleStore((s) => s.has);
  const history = useHistoryStore((s) => s.entries);
  const favorites = useFavoritesStore((s) => s.items);
  const cart = useCartStore((s) => s.items);
  const [source, setSource] = useState<Source>("history");
  const [busy, setBusy] = useState<string | null>(null);

  const rows: LocalRow[] =
    source === "cart"
      ? cart.map((i) => ({ barcode: i.product.barcode, name: i.product.name, imageUrl: i.product.imageUrl, score: i.score, product: i.product }))
      : (source === "favorites" ? favorites : history).map((e) => ({ barcode: e.barcode, name: e.name, imageUrl: e.imageUrl, score: e.score }));

  const addRow = async (row: LocalRow) => {
    if (row.product) { onAdd(row.product); return; }          // cart items carry the full product
    setBusy(row.barcode);
    try {
      const res = await getProduct(row.barcode);              // history/favorites → fetch (cached) then add
      if (res.kind === "product") onResolve(add(res.product), res.product.name);
    } catch {
      /* offline & uncached: leave the row actionable */
    }
    setBusy(null);
  };

  const sources: { id: Source; icon: typeof History; label: string }[] = [
    { id: "history", icon: History, label: t("srcHistory") },
    { id: "favorites", icon: Heart, label: t("srcFavorites") },
    { id: "cart", icon: ShoppingBasket, label: t("srcCart") }
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {sources.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => setSource(s.id)} data-active={source === s.id} aria-pressed={source === s.id}
              className="gc-pressable flex items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface py-2 text-xs font-semibold text-muted data-[active=true]:border-transparent data-[active=true]:bg-natural-grad data-[active=true]:text-white">
              <Icon className="h-4 w-4" /> {s.label}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t("srcEmpty")}</p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {rows.slice(0, 30).map((row) => {
            const inBattle = has(row.barcode);
            return (
              <div key={row.barcode} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5">
                <ProductThumbnail src={row.imageUrl} alt={row.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{row.name}</p>
                  {row.score !== undefined && <p className="text-xs text-muted tabular-nums">GreeScore {row.score}</p>}
                </div>
                <GreeButton size="icon" variant={inBattle ? "soft" : "neon"} aria-label={t("add")} onClick={() => addRow(row)} disabled={inBattle || busy === row.barcode}>
                  {busy === row.barcode ? <Loader2 className="h-4 w-4 animate-spin" /> : inBattle ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </GreeButton>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
