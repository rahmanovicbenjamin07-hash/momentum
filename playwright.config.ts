import { defineConfig, devices } from '@playwright/test'

const PORT = 5180

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Tests talk to the fake Supabase in e2e/support/mockSupabase.ts, never the real project.
    // Shell variables beat .env.local in Vite, so these win over your real URL and key.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'e2e-test-key',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
