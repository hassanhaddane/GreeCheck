"use client";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useConsentStore } from "@/stores/consent-store";
import { useMounted } from "@/lib/utils/use-mounted";

/** One-time consent gate — appears only until the user makes a choice. */
export function ConsentBanner() {
  const t = useTranslations("ads");
  const mounted = useMounted();
  const decided = useConsentStore((s) => s.decided);
  const setMode = useConsentStore((s) => s.setMode);

  if (!mounted || decided) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="fixed inset-x-0 bottom-0 z-[60] p-3 pb-24 md:pb-3"
        role="dialog"
        aria-live="polite"
      >
        <div className="mx-auto max-w-2xl gc-glass rounded-3xl p-4 shadow-glass">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-natural" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">{t("bannerTitle")}</p>
              <p className="mt-0.5 text-muted">
                {t("bannerBody")} <Link href="/privacy" className="text-natural underline">{t("learnMore")}</Link>
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="soft" size="sm" className="flex-1" onClick={() => setMode("non_personalized")}>
              {t("keepNonPersonalized")}
            </Button>
            <Button variant="neon" size="sm" className="flex-1" onClick={() => setMode("personalized")}>
              {t("acceptPersonalized")}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
