"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ScanLine, QrCode, Keyboard, ArrowRight } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Mode = "barcode" | "qr" | "manual";

export default function ScanPage() {
  const t = useTranslations("scan");
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("barcode");
  const [code, setCode] = useState("");

  const modes: { id: Mode; icon: typeof ScanLine }[] = [
    { id: "barcode", icon: ScanLine },
    { id: "qr", icon: QrCode },
    { id: "manual", icon: Keyboard }
  ];

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="flex items-center justify-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-neon-grad text-deep shadow-glow">
          <ScanLine className="h-4 w-4" />
        </span>
        <h1 className="text-xl font-bold tracking-tight gc-gradient-text">{t("title")}</h1>
      </div>

      {/* Camera viewport with futuristic overlay */}
      <Card className="relative aspect-[3/4] overflow-hidden bg-deep-grad p-0">
        <div className="absolute inset-0 grid place-items-center">
          {/* scan frame */}
          <div className="relative h-56 w-56">
            <div className="absolute inset-0 rounded-3xl border-2 border-neon/60 shadow-glow" />
            {["-top-px -left-px", "-top-px -right-px", "-bottom-px -left-px", "-bottom-px -right-px"].map((pos, i) => (
              <span key={i} className={`absolute h-7 w-7 rounded-md border-neon ${pos} ${i < 2 ? "border-t-4" : "border-b-4"} ${i % 2 === 0 ? "border-l-4 rounded-tl-3xl" : "border-r-4 rounded-br-3xl"}`} />
            ))}
            <motion.div
              className="absolute inset-x-3 h-0.5 rounded-full bg-neon shadow-glow"
              initial={{ top: "12%" }}
              animate={{ top: ["12%", "88%", "12%"] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
        {/* radar sweep ambiance */}
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-neon/10 blur-2xl" />
        <p className="absolute inset-x-0 bottom-6 text-center text-sm font-medium text-white/80">{t("instruction")}</p>
      </Card>

      {/* mode switch */}
      <div className="grid grid-cols-3 gap-2">
        {modes.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              data-active={mode === m.id}
              className="gc-pressable flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface py-3 text-xs font-semibold text-muted data-[active=true]:border-transparent data-[active=true]:bg-deep data-[active=true]:text-white"
            >
              <Icon className="h-5 w-5" />
              {t(m.id)}
            </button>
          );
        })}
      </div>

      {/* manual entry / fallback */}
      <Card className="p-4">
        <label className="text-xs font-medium text-muted">{t("manual")}</label>
        <div className="mt-2 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder={t("manualPlaceholder")}
            className="h-11 flex-1 rounded-2xl border border-line bg-surface-2 px-4 text-sm outline-none focus:ring-2 focus:ring-neon/50"
          />
          <Button
            variant="neon"
            size="icon"
            disabled={code.length < 6}
            onClick={() => router.push(`/product/${code}`)}
            aria-label="Go"
          >
            <ArrowRight className="h-5 w-5 rtl:rotate-180" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
