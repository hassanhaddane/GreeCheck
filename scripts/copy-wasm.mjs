/**
 * Self-host the barcode scanner WASM.
 *
 * `barcode-detector` (our cross-browser fallback) depends on `zxing-wasm`, whose
 * default `locateFile` fetches `zxing_full.wasm` from a public CDN (fastly.jsdelivr.net)
 * at runtime. GreeCheck is privacy-first and must not pull runtime code from a third
 * party, so we copy the binary into `public/wasm/` and serve it from our own origin.
 * The runtime override lives in `src/hooks/use-barcode-scanner.ts` (setZXingModuleOverrides).
 *
 * Runs automatically via the `predev` / `prebuild` npm scripts; also keeps the
 * committed copy in sync with the installed package version.
 */
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// barcode-detector resolves the bare "zxing-wasm" import -> the FULL build,
// which requests zxing_full.wasm. That's the only binary we need to self-host.
const candidates = ["node_modules/zxing-wasm/dist/full/zxing_full.wasm"];

mkdirSync(resolve(root, "public/wasm"), { recursive: true });

let copied = 0;
for (const rel of candidates) {
  const src = resolve(root, rel);
  if (existsSync(src)) {
    const file = rel.split("/").pop();
    copyFileSync(src, resolve(root, "public/wasm", file));
    console.log(`[copy-wasm] ${file} -> public/wasm/${file}`);
    copied++;
  }
}

if (!copied) {
  console.warn("[copy-wasm] No zxing wasm found in node_modules. A committed copy in public/wasm is used instead.");
}
