"use client";
import { Check } from "lucide-react";
import type { ScanMode } from "./scan-frame-shape";

/** Frame helps align a code in the preview. The confirmation appears only after detection. */
export function ScanOverlay({ mode, detected }: { mode: ScanMode; detected: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center pb-10">
      <div className={`relative w-3/4 max-w-[15rem] text-white ${mode === "qr" ? "aspect-square max-w-[11rem]" : "aspect-[2/1]"}`}>
        {[
          "start-0 top-0 border-s-2 border-t-2 rounded-ss-xl",
          "end-0 top-0 border-e-2 border-t-2 rounded-se-xl",
          "start-0 bottom-0 border-s-2 border-b-2 rounded-es-xl",
          "end-0 bottom-0 border-e-2 border-b-2 rounded-ee-xl"
        ].map(corner => <span key={corner} className={`absolute size-6 border-current ${corner}`} />)}
        {mode === "barcode" && <span className="absolute inset-x-2 top-1/2 h-0.5 bg-[#dceda8]" />}
        {detected && <span className="absolute inset-0 grid place-items-center"><span className="grid size-11 place-items-center rounded-full bg-[#dceda8] text-deep"><Check className="size-6" /></span></span>}
      </div>
    </div>
  );
}
