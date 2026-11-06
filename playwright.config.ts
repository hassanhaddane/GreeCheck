import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    serviceWorkers: "allow"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium"
      }
    }
  ],
  webServer: [
    {
      command: "node --import tsx tests/e2e/off-fixture-server.ts",
      url: "http://127.0.0.1:3101/ready"
    },
    {
      command: "npm run build && npm run start -- -p 3100",
      url: "http://127.0.0.1:3100/fr",
      env: { OFF_BASE_URL: "http://127.0.0.1:3101", OFF_PRODUCT_API_VERSION: "v3", OFF_SEARCH_BASE_URL: "http://127.0.0.1:3101", USDA_FDC_API_KEY: "", NEXT_PUBLIC_SITE_URL: "https://gree-check.vercel.app", GREECHECK_DONATION_URL: "", NOMINATIM_API_URL: "" },
      timeout: 180_000
    }
  ]
});
