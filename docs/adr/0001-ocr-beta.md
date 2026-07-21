# ADR 0001 — OCR beta (ingredient & nutrition photo extraction)

> Status: **Accepted (beta, isolated).** Date: 2026-07-20.
> Scope: a beta feature that reads an ingredient-list or nutrition-table
> photograph, presents the extracted fields for review, and — only after
> explicit confirmation — normalizes the values and (when complete) scores
> them. It does **not** do receipt scanning or visual product recognition.

## Context

Some products are missing from Open Food Facts, or the user wants to check a
label directly. Barcode scanning can't help there. OCR of the two label
regions that drive GreeScore (nutrition facts + ingredients) is a plausible
fallback — but OCR is error-prone, so the design centers on **user review and
explicit confirmation**, never on trusting the raw read.

## Decision

Ship OCR as an **isolated beta**, gated behind `OCR_BETA_ENABLED`
(`src/lib/flags.ts`), rendered as a self-contained island below the stable
scanner. The stable barcode scanner is untouched.

Pipeline (all steps enforced in code):
capture/upload → orientation correction → in-browser extract → **review** →
**explicit confirm** → normalize confirmed values only → score **only when
every required field is present** → label as "user-confirmed extracted data".

### Browser OCR (chosen)

- **Engine:** `tesseract.js` (WASM), `fra+eng`, loaded via **lazy dynamic
  import** inside `src/domains/ocr/engine.ts` — the ~2 MB engine + language
  data download only when the user starts a beta extraction, never on the
  stable scan path or on first paint.
- **Why:** it keeps the image on the device (see Privacy), needs no backend,
  and fits the "no server-side user data" constitution. The worker is
  `terminate()`d after each run so nothing lingers.

### Server OCR (rejected for beta)

- A cloud OCR (Google Vision, AWS Textract, self-hosted PaddleOCR) would be
  more accurate, especially on skewed/low-light photos.
- **Rejected because** it means sending a user's photo off-device. That is a
  material privacy change and is explicitly out of scope: *"Do not send images
  to an external service without an explicit privacy decision."* If ever
  revisited, it requires: an explicit opt-in per extraction, a disclosed
  processor + retention policy, an ADR superseding this one, and a privacy-page
  update — and it must remain optional (browser OCR stays the default).

## Privacy

- The image is a **session-only `blob:` object URL**, created on capture and
  `URL.revokeObjectURL`'d on reset and on unmount (`ocr-beta.tsx`). It is
  **never** written to IndexedDB or any cache, and **never** uploaded.
- Extraction runs in-browser; **no network request carries the image.**
- Only values the user **confirmed** are normalized; the confirmed payload
  (numbers + optional ingredient text) may flow into an in-memory product for
  scoring, flagged `origin: "user_ocr"`. The photo itself is not part of it.
- No analytics, no accounts — consistent with the rest of the app.

## Performance

- Lazy load keeps OCR entirely out of the initial and stable-scanner bundles.
- Extraction is the heavy step (~1–4 s on a mid-range phone for a single
  label region). It runs on an explicit user action with a clear loading
  state; the UI never blocks the stable scanner.
- The oriented image is rasterized to a canvas before OCR so the engine sees
  the corrected orientation without a second decode.
- Parsing/confirmation/normalization are pure and O(lines) — negligible.

## Supported devices

- Any browser with WASM + `getUserMedia`/file input (all current mobile
  Safari/Chrome/Firefox). Camera capture uses `<input capture="environment">`
  (rear camera) with an upload fallback for desktop or denied camera.
- Degradation: no camera → upload still works; WASM/engine failure →
  typed `engine_error` with a retry, never a crash.

## Expected failure modes (and handling)

| Failure | Handling |
|---|---|
| Blurry / low-light photo | Engine returns little/no text → `no_text_found`, ask to reframe/retake. |
| Skewed or rotated label | User rotates in the adjust step before extracting. |
| Misread digit (e.g. 21 → 2l) | Value shown for **review** with its source line; user edits or clears it. |
| Implausible value (9000 kcal/100 g) | Parser reports it **unreadable** (line kept, value absent) — never "auto-corrected". |
| Partial nutrition table | Score is **withheld**; the missing required fields are named. |
| Ingredients only | Confirmed and shown, but explicitly **not score-ready** on its own. |
| Engine/WASM error | Caught → `engine_error`, retry offered; nothing leaks to the console-facing UI. |
| Wrong language label | `fra+eng` only for beta; other scripts are a documented follow-up. |

## Consequences

- Users gain a fallback for missing products, with honest, reviewable output.
- Accuracy is inherently limited; the review+confirm gate makes that safe
  rather than misleading. Results are never saved silently and are always
  labeled as user-confirmed extracted data.
- Reversible: clearing `OCR_BETA_ENABLED` removes the entire surface; the
  `src/domains/ocr/*` modules are self-contained.

## References

- Flag: `src/lib/flags.ts` · Engine: `src/domains/ocr/engine.ts`
- Pure logic: `src/domains/ocr/{parse,confirm,model}.ts` (tested in `ocr.test.ts`)
- UI: `src/components/scan/ocr-beta.tsx`
