"use client";
import { useEffect } from "react";
import { bootLocalData } from "@/services/storage/boot";

/**
 * Client-only bootstrapper: migrates V1 localStorage data to IndexedDB (once)
 * and hydrates every feature store from its repository. Renders nothing, so
 * SSR output is untouched and there is no hydration mismatch.
 */
export function LocalDataBoot() {
  useEffect(() => {
    void bootLocalData();
  }, []);
  return null;
}
