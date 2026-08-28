import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html"], ["github"]] : "list",

  use: {
    baseURL,
    trace: "on-first-retry",
  },

  projects: [
    // Loguje się raz i zapisuje sesję dla pozostałych projektów.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"] },
    // Pixel 5 zamiast iPhone'a: oba emulują ten sam viewport i dotyk,
    // ale Pixel działa na chromium, więc CI instaluje jedną przeglądarkę zamiast dwóch.
    { name: "mobile", use: { ...devices["Pixel 5"] }, dependencies: ["setup"] },
  ],

  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // Limit rezerwacji z jednego adresu istnieje po to, żeby bot nie zapchał
      // grafiku. Testy tworzą kilka wizyt pod rząd, więc na czas przebiegu go
      // podnosimy - inaczej suite wywracałby się na własnym zabezpieczeniu.
      BOOKING_RATE_LIMIT: "100",
      LOGIN_RATE_LIMIT: "100",
    },
  },
});
