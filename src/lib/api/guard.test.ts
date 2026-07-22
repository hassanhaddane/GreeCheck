/** API hardening helpers — error envelopes, rate protection, payload validation. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { apiError, rateLimit, __resetRateLimitForTests, expectRecord, clampInt, isRecord } from "./guard";

const reqFrom = (ip: string) => new Request("https://greecheck.app/api/x", { headers: { "x-forwarded-for": ip } });

test("error envelopes are stable machine codes, never exception text", async () => {
  const res = apiError("upstream_unavailable", 502);
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { status: "error", error: "upstream_unavailable" });
});

test("rate limit allows up to the limit, then returns 429 with Retry-After", async () => {
  __resetRateLimitForTests();
  const req = reqFrom("1.1.1.1");
  assert.equal(rateLimit(req, "test", { limit: 2, windowMs: 60_000 }), null);
  assert.equal(rateLimit(req, "test", { limit: 2, windowMs: 60_000 }), null);
  const blocked = rateLimit(req, "test", { limit: 2, windowMs: 60_000 });
  assert.ok(blocked);
  assert.equal(blocked!.status, 429);
  assert.ok(blocked!.headers.get("Retry-After"));
  assert.deepEqual(await blocked!.json(), { status: "error", error: "rate_limited" });
});

test("rate limit is per client and per scope", () => {
  __resetRateLimitForTests();
  assert.equal(rateLimit(reqFrom("2.2.2.2"), "a", { limit: 1, windowMs: 60_000 }), null);
  assert.ok(rateLimit(reqFrom("2.2.2.2"), "a", { limit: 1, windowMs: 60_000 })); // same client+scope → blocked
  assert.equal(rateLimit(reqFrom("3.3.3.3"), "a", { limit: 1, windowMs: 60_000 }), null); // other client → ok
  assert.equal(rateLimit(reqFrom("2.2.2.2"), "b", { limit: 1, windowMs: 60_000 }), null); // other scope → ok
});

test("rate limit window resets", () => {
  __resetRateLimitForTests();
  const req = reqFrom("4.4.4.4");
  assert.equal(rateLimit(req, "w", { limit: 1, windowMs: 1 }), null);
  const before = Date.now();
  while (Date.now() - before < 3) { /* wait out the 1 ms window */ }
  assert.equal(rateLimit(req, "w", { limit: 1, windowMs: 1 }), null);
});

test("external payload validation rejects non-objects (HTML pages, arrays, null)", () => {
  assert.ok(isRecord({ a: 1 }));
  assert.equal(expectRecord({ product: {} })?.product !== undefined, true);
  assert.equal(expectRecord("<html>error</html>"), null);
  assert.equal(expectRecord([1, 2]), null);
  assert.equal(expectRecord(null), null);
  assert.equal(expectRecord(undefined), null);
});

test("clampInt keeps externally supplied numbers inside a safe range", () => {
  assert.equal(clampInt("5", 1, 1, 20), 5);
  assert.equal(clampInt("999", 1, 1, 20), 20);
  assert.equal(clampInt("-3", 1, 1, 20), 1);
  assert.equal(clampInt("abc", 7, 1, 20), 7);
  assert.equal(clampInt(null, 7, 1, 20), 7);
});
