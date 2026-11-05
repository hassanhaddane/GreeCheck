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
    serviceWorkers: "allow",
    permissions: ["camera"]
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] }
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
      env: { OFF_BASE_URL: "http://127.0.0.1:3101", OFF_PRODUCT_API_VERSION: "v3", USDA_FDC_API_KEY: "" },
      timeout: 180_000
    }
  ]
});
