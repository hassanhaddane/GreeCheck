import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADDITIVE_REGISTRY, ADDITIVE_REGISTRY_VERSION,
  lookupAdditive, normalizeAdditiveCode
} from "./additive-registry";

test("registry version is explicit and well-formed", () => {
  assert.match(ADDITIVE_REGISTRY_VERSION, /^AR-\d{4}\.\d{2}\.\d+$/);
});

test("GOVERNANCE: every entry has risk, ≥1 source, review date and status", () => {
  assert.ok(ADDITIVE_REGISTRY.length >= 40, "registry unexpectedly small");
  for (const e of ADDITIVE_REGISTRY) {
    assert.match(e.code, /^e\d+[a-z]?$/, `${e.code}: bad code format`);
    assert.ok(["none", "limited", "moderate", "high"].includes(e.risk), `${e.code}: bad risk`);
    assert.ok(e.sources.length >= 1 && e.sources.every((s) => s.length > 10), `${e.code}: missing sources`);
    assert.match(e.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, `${e.code}: bad review date`);
    assert.ok(["active", "under_review", "deprecated"].includes(e.status), `${e.code}: bad status`);
  }
});

test("no duplicate codes in the registry", () => {
  const codes = ADDITIVE_REGISTRY.map((e) => e.code);
  assert.equal(codes.length, new Set(codes).size);
});

test("normalization handles OFF tags and sub-variants", () => {
  assert.equal(normalizeAdditiveCode("en:e330"), "e330");
  assert.equal(normalizeAdditiveCode("en:e150d"), "e150d");
  assert.equal(normalizeAdditiveCode("E250"), "e250");
  assert.equal(normalizeAdditiveCode("en:e330i"), "e330");
});

test("known classifications: nitrite high, aspartame moderate, MSG limited, citric none", () => {
  assert.equal(lookupAdditive("en:e250").risk, "high");
  assert.equal(lookupAdditive("e951").risk, "moderate");
  assert.equal(lookupAdditive("e621").risk, "limited");
  assert.equal(lookupAdditive("e330").risk, "none");
});

test("unknown additive is 'unreviewed' — never a risk, never a guarantee", () => {
  const r = lookupAdditive("en:e9999");
  assert.equal(r.risk, "unreviewed");
  assert.equal(r.entry, undefined);
});
