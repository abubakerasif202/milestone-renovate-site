import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: 'test-results',
  use: { baseURL: `http://127.0.0.1:${PORT}`, channel: 'chrome', trace: 'off' },
  webServer: {
    command: 'node scripts/dev-server.mjs',
    env: { PORT: String(PORT) },
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 20_000,
  },
});
