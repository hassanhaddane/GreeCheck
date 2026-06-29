"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { ScanMode } from "./scan-frame-shape";

/** GreeLens decorative overlay: corner frame, radar sweep, scan line, detection flash. */
export function ScanOverlay({ mode, detected }: { mode: ScanMode; detected: boolean }) {
  const square = mode === "qr";
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      {/* radar ambiance */}
      <div className="absolute h-72 w-72 rounded-full bg-neon/10 blur-3xl" />

      <div
        className={`relative transition-all duration-500 ${square ? "h-60 w-60" : "h-44 w-64"}`}
      >
        {/* glowing frame */}
        <motion.div
          className="absolute inset-0 rounded-[1.75rem] border-2 border-neon/50"
          animate={detected ? { borderColor: "rgb(57 255 136)", boxShadow: "0 0 32px 4px rgba(57,255,136,0.55)" } : {}}
        />

        {/* animated corners */}
        {[
          "top-0 left-0 border-t-4 border-l-4 rounded-tl-[1.75rem]",
          "top-0 right-0 border-t-4 border-r-4 rounded-tr-[1.75rem]",
          "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-[1.75rem]",
          "bottom-0 right-0 border-b-4 border-r-4 rounded-br-[1.75rem]"
        ].map((pos, i) => (
          <span key={i} className={`absolute h-8 w-8 border-neon ${pos}`} />
        ))}

        {/* rotating radar sweep */}
        <div className="absolute inset-0 overflow-hidden rounded-[1.75rem]">
          <div
            className="absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 animate-radar-sweep"
            style={{ background: "conic-gradient(from 0deg, transparent 0deg, rgba(57,255,136,0.22) 40deg, transparent 80deg)" }}
          />
        </div>

        {/* scan line (barcode mode) */}
        {!square && !detected && (
          <motion.div
            className="absolute inset-x-4 h-0.5 rounded-full bg-neon shadow-glow"
            initial={{ top: "12%" }}
            animate={{ top: ["12%", "88%", "12%"] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* detection flash */}
        <AnimatePresence>
          {detected && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 grid place-items-center"
            >
              <span className="grid h-16 w-16 place-items-center rounded-full bg-neon-grad shadow-glow">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#0B3D2E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
