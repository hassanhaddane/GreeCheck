/**
 * API hardening helpers shared by every proxy route.
 *
 * Guarantees:
 *  - CONSISTENT error envelopes: `{ status: "error", error: <stable code> }`.
 *    A raw exception message is never returned to the client.
 *  - Per-instance RATE PROTECTION so a single client cannot exhaust our
 *    upstream quota (Open Food Facts is a shared community resource).
 *  - RUNTIME VALIDATION helpers for external payloads: an upstream that
 *    changes shape degrades to "unavailable", it never crashes a route.
 *
 * The rate-limit bucket is in-memory and per server instance — enough to stop
 * accidental floods and naive abuse. It stores a COARSE, ephemeral key only
 * (see docs/production/privacy-data-flows.md): no request contents, no
 * barcodes, no search terms, and nothing is persisted.
 */
import { NextResponse } from "next/server";

/* ───────────────────────── error envelopes ───────────────────────── */

export type ApiErrorCode =
  | "invalid_request"
  | "invalid_barcode"
  | "invalid_query"
  | "rate_limited"
  | "upstream_unreachable"
  | "upstream_unavailable"
  | "upstream_invalid_payload";

export function apiError(code: ApiErrorCode, status: number, headers?: HeadersInit) {
  // Deliberately opaque: stable machine code only, never an exception message.
  return NextResponse.json({ status: "error", error: code }, { status, headers });
}

/* ───────────────────────── rate protection ───────────────────────── */

interface Bucket { tokens: number; resetAt: number }
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

export interface RateLimitOptions {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in ms. */
  windowMs: number;
}

/** Coarse client key: first IP from the proxy chain, else a shared fallback. */
function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim();
  return ip || req.headers.get("x-real-ip") || "anonymous";
}

/**
 * Fixed-window limiter. Returns `null` when the request may proceed, or a
 * ready-to-return 429 response with `Retry-After`.
 */
export function rateLimit(req: Request, scope: string, opts: RateLimitOptions): NextResponse | null {
  const now = Date.now();
  const key = `${scope}:${clientKey(req)}`;
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size >= MAX_BUCKETS) buckets.clear(); // bounded memory, self-healing
    buckets.set(key, { tokens: opts.limit - 1, resetAt: now + opts.windowMs });
    return null;
  }
  if (bucket.tokens <= 0) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return apiError("rate_limited", 429, { "Retry-After": String(retryAfter) });
  }
  bucket.tokens -= 1;
  return null;
}

/** Test-only reset so limiter state never leaks between test cases. */
export function __resetRateLimitForTests() {
  buckets.clear();
}

/* ─────────────────── external payload validation ─────────────────── */

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const isArray = (v: unknown): v is unknown[] => Array.isArray(v);

/**
 * Validate that an upstream JSON payload is a usable object before it reaches
 * the normalizer. Anything else (HTML error page, array, null, string) is a
 * protocol violation on the upstream's side, not a crash on ours.
 */
export function expectRecord(payload: unknown): Record<string, unknown> | null {
  return isRecord(payload) ? payload : null;
}

/** Clamp any externally supplied integer into a safe range. */
export function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = Number(raw ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
