import { expect, test } from "@playwright/test";
import { mockProductApis, poorProduct } from "./fixtures";

test.describe("GreeLens camera and first scan", () => {
  test.beforeEach(async ({ page }) => {
    await mockProductApis(page);
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("accepted camera, first successful scan, optional help and rapid session", async ({ page }) => {
    await page.goto("/fr/scan?source=pwa");
    await expect(page.getByRole("heading", { name: "GreeLens" })).toBeVisible();
    await expect(page.getByText("Recherche d'un code…", { exact: true })).toBeVisible();

    await page.getByRole("textbox", { name: "Saisie manuelle" }).fill("11111115");
    await page.getByRole("button", { name: "Entrer le code-barres", exact: true }).click();
    await expect(page.getByLabel("Scan éclair").getByText("Test Choco", { exact: true })).toBeVisible();
    const intro = page.getByRole("dialog", { name: "Bienvenue dans GreeCheck" });
    await expect(intro).toBeHidden();
    await page.getByRole("button", { name: "Comment lire le résultat ?" }).click();
    await expect(intro).toBeVisible();
    await intro.getByRole("button", { name: "Ignorer" }).filter({ hasText: "Ignorer" }).click();

    await page.getByRole("button", { name: "Scanner un autre" }).click();
    await page.getByRole("textbox", { name: "Saisie manuelle" }).fill("22222220");
    await page.getByRole("button", { name: "Entrer le code-barres", exact: true }).click();
    await expect(page.getByLabel("Scan éclair").getByText("Test Oats", { exact: true })).toBeVisible();
    await expect(page.getByText("2 scannés dans cette session", { exact: true })).toBeVisible();
    await expect(intro).toBeHidden();

    await page.goto("/fr/history");
    await expect(page).toHaveURL(/\/fr\/products$/);
    await expect(page.locator("main").getByText("Test Oats", { exact: true }).last()).toBeVisible();
    await expect(page.locator("main").getByText("Test Choco", { exact: true }).last()).toBeVisible();
  });

  test("denied camera recovers with manual and text-search fallbacks", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          enumerateDevices: async () => [],
          getUserMedia: async () => { throw new DOMException("Permission denied", "NotAllowedError"); }
        }
      });
    });
    await mockProductApis(page);
    await page.goto("/fr/scan");
    await expect(page.getByLabel("GreeLens").getByText("Caméra refusée", { exact: true })).toBeVisible();
    await expect(page.getByLabel("GreeLens").getByRole("button", { name: "Rechercher par texte" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Saisie manuelle" })).toBeVisible();
  });

  test("product not found is explicit and recoverable", async ({ page }) => {
    await page.goto("/fr/scan");
    await page.getByRole("textbox", { name: "Saisie manuelle" }).fill("99999995");
    await page.getByRole("button", { name: "Entrer le code-barres", exact: true }).click();
    await expect(page.getByText("Produit introuvable dans Open Food Facts.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Contribuer sur Open Food Facts" }))
      .toHaveAttribute("href", "https://fr.openfoodfacts.org/cgi/product.pl?type=add&code=99999995");
  });
});

test("decodes a real EAN-8 pattern from video, starts one slow lookup and releases the camera", async ({ page }) => {
  await mockProductApis(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async (constraints: MediaStreamConstraints) => {
        const canvas = document.createElement("canvas");
        canvas.width = 480;
        canvas.height = 260;
        const pen = canvas.getContext("2d")!;
        const left = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001"];
        // ISO EAN-8 guard patterns and digit encodings for test GTIN 11111115.
        const pattern = "101" + left[1].repeat(4) + "01010"
          + (left[1].repeat(3) + left[5]).replace(/[01]/g, (bit) => bit === "1" ? "0" : "1") + "101";
        const draw = () => {
          pen.fillStyle = "white";
          pen.fillRect(0, 0, canvas.width, canvas.height);
          pen.fillStyle = "black";
          [...pattern].forEach((bit, i) => { if (bit === "1") pen.fillRect(39 + i * 6, 48, 6, 164); });
        };
        const stream = canvas.captureStream(12);
        const track = stream.getVideoTracks()[0];
        const timer = setInterval(() => track.readyState === "ended" ? clearInterval(timer) : draw(), 80);
        Object.assign(window, { testTrack: track, testCameraConstraints: constraints });
        return stream;
      }
    });
  });

  let requests = 0;
  let releaseLookup!: () => void;
  const slow = new Promise<void>((resolve) => { releaseLookup = resolve; });
  await page.route("**/api/product/11111115", async (route) => {
    requests++;
    await slow;
    await route.fulfill({ json: { status: "complete", product: poorProduct } });
  });

  await page.goto("/fr/scan");
  try {
    await expect(page.getByRole("status").filter({ hasText: "Analyse nutritionnelle" })).toHaveCount(1);
    await expect.poll(() => page.evaluate(() =>
      (window as unknown as { testTrack: MediaStreamTrack }).testTrack.readyState)).toBe("ended");
    const constraints = await page.evaluate(() => (window as unknown as { testCameraConstraints: MediaStreamConstraints }).testCameraConstraints);
    expect(constraints).toMatchObject({ audio: false, video: { facingMode: { ideal: "environment" } } });
  } finally {
    releaseLookup();
  }
  const verdict = page.getByRole("region", { name: "Scan éclair" });
  await expect(verdict.getByText("Test Choco")).toBeVisible();
  await expect(verdict.getByText(/\d+\/100/)).toBeVisible();
  expect(requests).toBe(1);
});

test("camera unavailable keeps manual entry and an honest partial verdict", async ({ page }) => {
  await mockProductApis(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => { throw new DOMException("No camera", "NotFoundError"); }
    });
  });
  await page.goto("/fr/scan");
  await expect(page.getByRole("region", { name: "GreeLens" }).getByText("Aucune caméra détectée", { exact: true })).toBeVisible();
  const input = page.getByRole("textbox", { name: "Saisie manuelle" });
  await input.fill("٤٤٤٤ ٤٤٤٠");
  await input.press("Enter");
  const result = page.getByRole("region", { name: "Scan éclair" });
  await expect(result.getByText("Test Partial Product")).toBeVisible();
  await expect(result.getByText("Non évaluable", { exact: true })).toBeVisible();
  await expect(result.getByRole("link", { name: "Compléter la fiche" })).toBeVisible();
  await expect(result.getByText(/\d+\/100/)).toHaveCount(0);
});

test("a stream granted after pagehide is stopped without starting a decoder", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () => new Promise<MediaStream>((resolve) => {
        Object.assign(window, { grantLateCamera: () => {
          const canvas = document.createElement("canvas");
          const stream = canvas.captureStream();
          Object.assign(window, { testLateTrack: stream.getVideoTracks()[0] });
          resolve(stream);
        } });
      })
    });
  });
  await page.goto("/fr/scan");
  await expect.poll(() => page.evaluate(() => "grantLateCamera" in window)).toBe(true);
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent("pagehide"));
    (window as unknown as { grantLateCamera: () => void }).grantLateCamera();
  });
  await expect.poll(() => page.evaluate(() =>
    (window as unknown as { testLateTrack: MediaStreamTrack }).testLateTrack.readyState)).toBe("ended");
  expect(await page.locator("video").evaluate((video: HTMLVideoElement) => video.srcObject === null)).toBe(true);
});

test("an allergen alert remains visible when no trustworthy swap exists", async ({ page }) => {
  await mockProductApis(page);
  await page.goto("/fr/criteria");
  await page.getByText("Options avancées", { exact: true }).click();
  await page.getByRole("button", { name: "Lait", exact: true }).click();
  await page.goto("/fr/scan");
  await page.getByRole("textbox", { name: "Saisie manuelle" }).fill("11111115");
  await page.getByRole("button", { name: "Entrer le code-barres", exact: true }).click();
  const verdict = page.getByRole("region", { name: "Scan éclair" });
  await expect(verdict.getByRole("alert")).toContainText("Allergène signalé ou trace possible");
  await verdict.getByRole("button", { name: "Trouver une alternative" }).click();
  await expect(verdict.getByText("Aucune alternative comparable et mieux notée n’a été trouvée.")).toBeVisible();
  await expect(verdict.getByRole("alert")).toBeVisible();
});

test("camera switch releases the previous track and only offers torch control on a capable track", async ({ page }) => {
  await page.addInitScript(() => {
    const media = navigator.mediaDevices;
    const fakeCamera = media.getUserMedia.bind(media);
    const tracks: MediaStreamTrack[] = [];
    Object.assign(window, { cameraTracks: tracks });
    Object.defineProperties(media, {
      enumerateDevices: { value: async () => [
        { kind: "videoinput", deviceId: "rear", label: "Rear" },
        { kind: "videoinput", deviceId: "front", label: "Front" }
      ] },
      getUserMedia: { value: async ({ video }: MediaStreamConstraints) => {
        const id = ((video as MediaTrackConstraints).deviceId as ConstrainDOMStringParameters | undefined)?.exact ?? "rear";
        const stream = await fakeCamera({ video: true });
        const track = stream.getVideoTracks()[0];
        tracks.push(track);
        let torch = false;
        let applied: MediaTrackConstraints = {};
        Object.defineProperties(track, {
          getSettings: { value: () => ({ deviceId: id, torch }) },
          getCapabilities: { value: () => ({ torch: id === "rear" ? [true, false] : [false], focusMode: ["continuous"] }) },
          getConstraints: { value: () => applied },
          applyConstraints: { value: async (constraints: MediaTrackConstraints) => {
            applied = constraints;
            const next = constraints.advanced?.find(value => "torch" in value);
            if (next) torch = Boolean(next.torch);
          } }
        });
        return stream;
      } }
    });
  });
  await page.goto("/fr/scan");
  const lamp = page.getByRole("button", { name: "Allumer la lampe" });
  await expect(lamp).toBeVisible();
  await lamp.click();
  await expect(page.getByRole("button", { name: "Éteindre la lampe" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("combobox", { name: "Caméra", exact: true }).selectOption("front");
  await expect(page.getByRole("combobox", { name: "Caméra", exact: true })).toHaveValue("front");
  await expect(page.getByRole("button", { name: /la lampe/ })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() =>
    (window as unknown as { cameraTracks: MediaStreamTrack[] }).cameraTracks.map(track => track.readyState))).toEqual(["ended", "live"]);
});

test("switching the scanner language preserves locally scanned products", async ({ page }) => {
  await mockProductApis(page);
  await page.goto("/fr/scan");
  await page.getByRole("textbox", { name: "Saisie manuelle" }).fill("11111115");
  await page.getByRole("button", { name: "Entrer le code-barres", exact: true }).click();
  await expect(page.getByRole("region", { name: "Scan éclair" })).toContainText("Test Choco");
  await page.getByRole("button", { name: "Plus", exact: true }).click();
  await page.getByRole("button", { name: "Changer de langue" }).click();
  await page.getByRole("button", { name: /العربية/ }).click();
  await expect(page).toHaveURL(/\/ar\/scan$/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.goto("/ar/products");
  await expect(page.locator("main").getByRole("link", { name: /Test Choco/ })).toBeVisible();
});
