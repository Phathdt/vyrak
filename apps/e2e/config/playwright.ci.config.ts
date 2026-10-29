import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const baseURL = process.env.BASE_URL || 'http://localhost:5173'

/**
 * CI-optimized Playwright configuration
 * Runs critical smoke tests only for fast PR validation
 * Full test suite runs on schedule or on-demand
 */
export default defineConfig({
  testDir: path.resolve(__dirname, '../tests'),
  globalSetup: path.resolve(__dirname, './global-setup.ts'),

  // Test selection: Only run smoke test files
  testMatch: [
    '**/auth/login.spec.ts',
    '**/auth/session-persistence.spec.ts',
    '**/dashboard/dashboard.spec.ts',
    '**/dashboard/login-to-dashboard.spec.ts',
  ],

  fullyParallel: true,
  forbidOnly: true,
  retries: 0, // No retries - fail fast
  workers: 4, // 4 parallel workers
  timeout: 30000, // 30s per test

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
    ['github'],
  ],

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 15000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
