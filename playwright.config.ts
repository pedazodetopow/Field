import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:4173/Field/" },
  projects: [
    {
      name: "chromium-mobile",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        launchOptions: { executablePath: process.env.FIELD_CHROMIUM_PATH },
      },
    },
    { name: "webkit-mobile", use: { ...devices["iPhone 13"] } },
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath: process.env.FIELD_CHROMIUM_PATH },
      },
    },
  ],
  webServer: {
    command: "npm run preview -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/Field/",
    reuseExistingServer: !process.env.CI,
  },
});
