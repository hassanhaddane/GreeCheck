/**
 * Normalized upstream/API errors — one vocabulary for routes and clients.
 * No raw upstream error ever reaches the UI.
 */
export type ApiErrorCode = "network" | "rate_limited" | "upstream" | "invalid_request";

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

export class RateLimitedError extends ApiError {
  constructor(retryAfterMs?: number) {
    super("rate_limited", "upstream rate limited", retryAfterMs);
    this.name = "RateLimitedError";
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
export function retryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const secs = Number(header);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const at = Date.parse(header);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
}
