/**
 * Normalized upstream/API errors — one vocabulary for routes and clients.
 * No raw upstream error ever reaches the UI.
 */
export type ApiErrorCode = "network" | "rate_limited" | "unavailable" | "upstream" | "invalid_request" | "invalid_payload";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  /** Suggested wait before retrying (ms), when the upstream provided one. */
  readonly retryAfterMs?: number;

  constructor(code: ApiErrorCode, message: string, retryAfterMs?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

/** Map any thrown value to a normalized ApiError. */
export function normalizeError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const message = err instanceof Error ? err.message : String(err);
  if (/fetch failed|network|abort|timeout/i.test(message)) return new ApiError("network", message);
  return new ApiError("upstream", message);
}

/** Parse a Retry-After header (seconds or HTTP date) into milliseconds. */
export function retryAfterMs(header: string | null, now = Date.now()): number | undefined {
  if (!header?.trim()) return undefined;
  if (/^\d+$/.test(header.trim())) {
    const ms = Number(header) * 1000;
    return Number.isFinite(ms) ? ms : undefined;
  }
  const at = Date.parse(header);
  return Number.isNaN(at) ? undefined : Math.max(0, at - now);
}
