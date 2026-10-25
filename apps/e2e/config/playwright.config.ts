import * as path from 'path'
import { defineConfig, devices } from '@playwright/test'

import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const baseURL = process.env.BASE_URL || 'http://localhost:5173'
const apiURL = process.env.API_URL || 'http://localhost:3000'
const isCI = !!process.env.CI

export default defineConfig({
  testDir: '../tests',
  fullyParallel: !isCI, // Sequential in CI to avoid conflicts
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined, // Single worker in CI
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
    ...(isCI ? [['github'] as const] : []),
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: isCI ? 15000 : 10000,
    navigationTimeout: isCI ? 15000 : 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox and Webkit only for local full testing
    ...(!isCI
      ? [
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
  ],
  webServer: isCI
    ? undefined
    : [
        {
          command: 'cd ../../ && yarn dev:api',
          url: apiURL,
          reuseExistingServer: true,
          timeout: 30000,
        },
        {
          command: 'cd ../../ && yarn dev:web',
          url: baseURL,
          reuseExistingServer: true,
          timeout: 30000,
        },
      ],
})
