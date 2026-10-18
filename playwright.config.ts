import { defineConfig } from '@playwright/test';
import fs from 'node:fs';

// Use a system Chrome when present (CHROME_PATH or /usr/bin/google-chrome);
// otherwise Playwright's own Chromium (`pnpm exec playwright install chromium`).
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const launchOptions = fs.existsSync(chromePath) ? { executablePath: chromePath } : {};
const port = 4173;

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.artifacts/results',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 900 },
    launchOptions,
  },
  projects: [
    { name: 'e2e', testMatch: /.*\.spec\.ts/, use: { viewport: { width: 1440, height: 900 }, launchOptions } },
    { name: 'bench', testMatch: /.*\.bench\.ts/, use: { viewport: { width: 1440, height: 900 }, launchOptions } },
  ],
  webServer: {
    // Always serve a fresh production build: the benchmark and size claims are about what ships.
    command: `pnpm exec vite build --logLevel warn && pnpm exec vite preview --port ${port} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
