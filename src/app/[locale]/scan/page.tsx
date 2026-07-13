import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { ScanClient } from "./scan-client";

export default function ScanPage() {
  return (
    <Suspense fallback={<ScanFallback />}>
      <ScanClient />
    </Suspense>
  );
}

function ScanFallback() {
  return (
    <div className="mx-auto max-w-md space-y-5 pb-4">
      <div className="mx-auto h-8 w-36 rounded-2xl bg-surface-2" />
      <Card className="aspect-[3/4] animate-pulse bg-surface-2 p-0" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-12 rounded-2xl bg-surface-2" />
        <div className="h-12 rounded-2xl bg-surface-2" />
      </div>
    </div>
  );
}
