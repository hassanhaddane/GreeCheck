import { ApiError, retryAfterMs } from "./errors";

export function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

export function nonEmpty(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

export function finite(value: unknown): number | undefined {
  const n = typeof value === "string" && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())
    ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

export function quantity(value: unknown): number | undefined {
  const n = finite(value);
  return n !== undefined && n >= 0 ? n : undefined;
}

export function nutrientValue(value: unknown, unit: unknown, target: "g" | "kcal"): number | undefined {
  const n = quantity(value);
  const u = nonEmpty(unit)?.toLowerCase();
  if (n === undefined) return undefined;
  if (u === target) return n;
  if (target === "g" && u === "mg") return n / 1000;
  if (target === "g" && (u === "µg" || u === "μg" || u === "ug")) return n / 1_000_000;
  if (target === "kcal" && u === "kj") return n / 4.184;
  return undefined;
}

export function invalidPayload(): never {
  throw new ApiError("invalid_payload", "Invalid upstream payload");
}

export async function jsonObject(response: Response): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return invalidPayload();
  }
  return record(body) ?? invalidPayload();
}

/** Each limiter applies to upstream cache misses in this server instance. */
export function upstream(limit: number, windowMs = 60_000, waitMs = 30_000) {
  let startedAt = 0;
  let used = 0;
  let cooldownUntil = 0;
  let cooldownCode: "rate_limited" | "unavailable" = "rate_limited";

  return async (url: URL, headers: HeadersInit, timeoutMs: number): Promise<Response> => {
    const now = Date.now();
    if (now < cooldownUntil) throw new ApiError(cooldownCode, "Upstream cooling down", cooldownUntil - now);
    if (now - startedAt >= windowMs) {
      startedAt = now;
      used = 0;
    }
    if (used >= limit) throw new ApiError("rate_limited", "Upstream budget reached", startedAt + windowMs - now);
    used++;

    let response: Response;
    try {
      response = await fetch(url, { headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
    } catch {
      // Do not include a URL, which can contain the USDA credential.
      throw new ApiError("network", "Upstream request failed");
    }
    if (response.status === 429 || response.status === 503) {
      const delay = retryAfterMs(response.headers.get("Retry-After")) ?? (response.status === 429 ? waitMs : 30_000);
      const code = response.status === 429 ? "rate_limited" : "unavailable";
      const until = Date.now() + delay;
      if (until >= cooldownUntil) {
        cooldownCode = code;
        cooldownUntil = until;
      }
      throw new ApiError(code, "Upstream temporarily unavailable", delay);
    }
    return response;
  };
}

export function cachedRequests<T>(maxEntries: number, ttl: (value: T) => number) {
  const cache = new Map<string, { expiresAt: number; value: T }>();
  const pending = new Map<string, Promise<T>>();
  return (key: string, load: () => Promise<T>): Promise<T> => {
    const saved = cache.get(key);
    if (saved && Date.now() < saved.expiresAt) return Promise.resolve(saved.value);
    cache.delete(key);
    const inFlight = pending.get(key);
    if (inFlight) return inFlight;
    const promise = load().then((value) => {
      const duration = ttl(value);
      if (duration > 0) {
        const oldest = cache.keys().next();
        if (cache.size >= maxEntries && !oldest.done) cache.delete(oldest.value);
        cache.set(key, { value, expiresAt: Date.now() + duration });
      }
      return value;
    }).finally(() => pending.delete(key));
    pending.set(key, promise);
    return promise;
  };
}
