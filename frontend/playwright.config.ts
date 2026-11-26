import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Service workers are only enabled in the offline/PWA test.
    serviceWorkers: "block",
    locale: "hr-HR",
  },
  projects: [{ name: "phone", use: { ...devices["Pixel 7"] } }],
  webServer: {
    // Test against the real production build. The backend URL points to a fake host
    // that every test intercepts (the real Claude API is never called).
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: { VITE_BACKEND_URL: "https://backend.test" },
    timeout: 120_000,
  },
});
