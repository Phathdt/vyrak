export const TEST_TIMEOUTS = {
  QUICK_CHECK: 1000,
  ACTION: 3000,
  NAVIGATION: 5000,
  API_CALL: 10000,
} as const

export const TEST_CONFIG = {
  viewport: {
    width: 1366,
    height: 768,
  },
  slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO, 10) : 0,
} as const

export type TestTimeouts = typeof TEST_TIMEOUTS
export type TestConfig = typeof TEST_CONFIG
