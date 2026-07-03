"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallPrompt({ variant = "card" }: { variant?: "card" | "button" }) {
  const t = useTranslations("pwa");
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    try { await deferred.userChoice; } catch { /* dismissed */ }
    setDeferred(null);
  };

  if (installed || !deferred || dismissed) return null;

  if (variant === "button") {
    return (
      <Button variant="neon" size="sm" onClick={install}>
        <Download className="h-4 w-4" /> {t("install")}
      </Button>
    );
  }

  return (
    <Card className="flex items-center gap-3 border-natural/25 bg-natural/5 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neon-grad text-deep shadow-glow">
        <Download className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{t("installTitle")}</p>
        <p className="text-xs text-muted">{t("installBody")}</p>
      </div>
      <Button variant="neon" size="sm" onClick={install}>{t("install")}</Button>
      <button onClick={() => setDismissed(true)} aria-label="dismiss" className="text-muted hover:text-ink">
        <X className="h-4 w-4" />
      </button>
    </Card>
  );
}
