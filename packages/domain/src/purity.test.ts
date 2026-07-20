/**
 * Purity guard — the domain package's independence, enforced.
 *
 * Scans every source file for forbidden dependencies. This test runs in the
 * app's test suite: any future import of React, Next.js, storage, i18n or
 * network code inside the package fails CI immediately.
 * (node:fs/path here is test tooling, not a package runtime dependency.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = dirname(fileURLToPath(import.meta.url));

const FORBIDDEN_IMPORTS = [
  /from\s+"react/, /from\s+"next/, /from\s+"zustand/, /from\s+"dexie/,
  /from\s+"next-intl/, /from\s+"@\//, /require\(/
];
const FORBIDDEN_GLOBALS = [
  /\bwindow\./, /\bdocument\./, /\bnavigator\./, /\bindexedDB\b/,
  /\blocalStorage\b/, /\bfetch\(/, /new\s+XMLHttpRequest/, /\bWebSocket\b/
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : [];
  });
}

test("domain package imports nothing from app, UI, storage or network layers", () => {
  for (const file of walk(SRC)) {
    if (file.endsWith(".test.ts")) continue; // tests may use node builtins
    const text = readFileSync(file, "utf8");
    for (const re of FORBIDDEN_IMPORTS) {
      assert.ok(!re.test(text), `${file} matches forbidden import ${re}`);
    }
    for (const re of FORBIDDEN_GLOBALS) {
      assert.ok(!re.test(text), `${file} uses forbidden global ${re}`);
    }
  }
});

test("all cross-module imports inside the package are relative", () => {
  for (const file of walk(SRC)) {
    const text = readFileSync(file, "utf8");
    // statement-anchored: ignores the word "from" inside comments/prose
    const specs = [...text.matchAll(/^\s*(?:import|export)[^;]*?from\s+"([^"]+)"/gm)].map((m) => m[1]);
    for (const s of specs) {
      assert.ok(
        s.startsWith(".") || s.startsWith("node:"),
        `${file} imports "${s}" — package files may only import relatively or node: builtins in tests`
      );
    }
  }
});
