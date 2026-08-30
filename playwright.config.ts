import { defineConfig } from '@playwright/test'

// E2E for the draggable selection handles. Loads the built extension (dist/)
// into a real Chromium and drives it over a static fixture page served on 5566.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: false, // one persistent-context extension at a time
  workers: 1,
  use: { baseURL: 'http://localhost:5566' },
  webServer: {
    command: 'python3 -m http.server 5566 -d tests/e2e/fixtures',
    url: 'http://localhost:5566/index.html',
    reuseExistingServer: !process.env.CI,
  },
})
