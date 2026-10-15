import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "e2e", timeout: 60_000, fullyParallel: false, workers: 1, reporter: "list",
  use: { baseURL: "http://localhost:3111", viewport: { width: 1440, height: 900 }, trace: "off" },
  webServer: { command: "npx next dev -p 3111", url: "http://localhost:3111/miroisdead/login", reuseExistingServer: true, timeout: 120_000 },
});
