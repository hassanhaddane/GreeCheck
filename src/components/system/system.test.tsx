/**
 * Design-system smoke tests (SSR render, no DOM):
 * • primitives render to valid markup on the server;
 * • score / grade / confidence are conveyed by TEXT, never color alone;
 * • the semantic glyph map is complete;
 * • browser-only components degrade safely during SSR.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { GreeBadge } from "./gree-badge";
import { GreeButton } from "./gree-button";
import { GreeIcon, GREE_GLYPHS, type GreeGlyph } from "./gree-icon";
import { InsightRow } from "./insight-row";
import { EmptyState } from "./empty-state";
import { TrustHalo } from "./trust-halo";
import { VerdictCard } from "./verdict-card";
import { GreeBottomSheet } from "./gree-bottom-sheet";
import { ScanLine } from "lucide-react";
import fr from "../../../messages/fr.json" with { type: "json" };
import { computeGreeScore } from "@greecheck/domain/scoring/gree-score";
import { defaultPreferences } from "@greecheck/domain/criteria/model";

const withIntl = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="fr" messages={fr as never} timeZone="UTC">
      {node}
    </NextIntlClientProvider>
  );

test("GREE_GLYPHS covers the 16 required semantic pictograms", () => {
  const required: GreeGlyph[] = [
    "sugar", "salt", "saturatedFat", "protein", "fiber", "additives", "processing",
    "organic", "halal", "vegan", "allergens", "confidence", "history", "battle", "cart", "swap"
  ];
  for (const g of required) assert.ok(GREE_GLYPHS[g], `missing glyph: ${g}`);
  assert.equal(Object.keys(GREE_GLYPHS).length, 16);
});

test("GreeBadge and GreeButton render server-side with tone/variant classes", () => {
  const badge = renderToStaticMarkup(<GreeBadge tone="positive">Bon choix</GreeBadge>);
  assert.match(badge, /Bon choix/);
  assert.match(badge, /text-score-a-ink/);
  const btn = renderToStaticMarkup(<GreeButton variant="neon">Scanner</GreeButton>);
  assert.match(btn, /Scanner/);
  assert.match(btn, /bg-deep/);
  assert.match(btn, /focus-visible:ring-2/);
});

test("GreeIcon exposes an accessible name when labelled, and hides when decorative", () => {
  const labelled = renderToStaticMarkup(<GreeIcon glyph="organic" label="Produit bio" />);
  assert.match(labelled, /role="img"/);
  assert.match(labelled, /aria-label="Produit bio"/);
  const decorative = renderToStaticMarkup(<GreeIcon icon={ScanLine} />);
  assert.match(decorative, /aria-hidden="true"/);
});

test("TrustHalo conveys confidence with TEXT (never color alone)", () => {
  for (const [level, text] of [["high", "Confiance élevée"], ["medium", "Données partielles"], ["low", "Données insuffisantes"]] as const) {
    const html = withIntl(<TrustHalo level={level} />);
    assert.match(html, new RegExp(text));
  }
});

test("VerdictCard shows numeric score, grade text and confidence text", () => {
  const gree = computeGreeScore({
    barcode: "1", name: "Yaourt nature", source: "openfoodfacts", categories: ["yogurts"],
    nutriments: {}, nutriScore2023: { points: 5, grade: "c" }
  }, defaultPreferences);
  const html = withIntl(<VerdictCard gree={gree} title="Yaourt nature" />);
  assert.match(html, />71</);                 // numeric score as text
  assert.match(html, /Bon choix/);            // verdict as text
  assert.match(html, /Données partielles/);   // confidence as text
  assert.match(html, /Yaourt nature/);
});

test("InsightRow and EmptyState render statically (server-safe primitives)", () => {
  const row = renderToStaticMarkup(<InsightRow glyph="sugar" tone="caution" label="Trop sucré" value="56 g" />);
  assert.match(row, /Trop sucré/);
  assert.match(row, /56 g/);
  const empty = renderToStaticMarkup(<EmptyState icon={ScanLine} title="Aucun scan" description="Scanne un produit" />);
  assert.match(empty, /Aucun scan/);
});

test("GreeBottomSheet degrades safely in SSR (no document → renders nothing, no crash)", () => {
  const html = renderToStaticMarkup(
    <GreeBottomSheet open onClose={() => {}} title="Ajouter">
      <p>contenu</p>
    </GreeBottomSheet>
  );
  assert.equal(html, "");
});
