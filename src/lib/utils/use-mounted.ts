"use client";
import { useEffect, useState } from "react";

/** True only after client mount — gates localStorage-backed UI to prevent hydration mismatch. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
