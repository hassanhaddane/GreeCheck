"use client";
import { useSyncExternalStore } from "react";

// A store that never changes: the snapshot differs only between server and client.
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/** True only after client mount — gates localStorage-backed UI to prevent hydration mismatch. */
export function useMounted() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
