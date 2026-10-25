import { URLS } from '@config/urls.config'
import { test as base, expect, type Page } from '@playwright/test'

export interface AuthUser {
  email: string
  password: string
  token?: string
}

export interface AuthFixtures {
  authenticatedPage: Page
  testUser: AuthUser
}

/**
 * Login helper function
 */
async function login(page: Page, email: string, password: string): Promise<string> {
  await page.goto(URLS.ROUTES.LOGIN)

  await page.getByTestId('login-email-input').fill(email)
  await page.getByTestId('login-password-input').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for redirect after successful login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 })

  // Get token from localStorage (uses vyrak_access_token key)
  const token = await page.evaluate(() => localStorage.getItem('vyrak_access_token'))

  if (!token) {
    throw new Error('Failed to retrieve auth token after login')
  }

  return token
}

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  testUser: async (_workerInfo, use) => {
    // Use env vars or default test user credentials
    const user: AuthUser = {
      email: process.env.TEST_USER_EMAIL || 'admin@vyrak.dev',
      password: process.env.TEST_USER_PASSWORD || 'Password123!',
    }
    await use(user)
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    // Attempt to load existing auth state
    const storageStatePath = 'test-results/.auth/user.json'

    try {
      // Try to use saved state
      const fs = await import('fs/promises')
      const storageState = JSON.parse(await fs.readFile(storageStatePath, 'utf-8'))
      await page.context().addCookies(storageState.cookies)

      // Verify auth state is valid
      await page.goto(URLS.ROUTES.HOME)
      const token = await page.evaluate(() => localStorage.getItem('vyrak_access_token'))

      if (!token) {
        throw new Error('Saved auth state is invalid')
      }
    } catch {
      // No saved state or invalid, perform login
      const token = await login(page, testUser.email, testUser.password)
      testUser.token = token

      // Save auth state for reuse
      const fs = await import('fs/promises')
      const path = await import('path')
      const dir = path.dirname(storageStatePath)
      await fs.mkdir(dir, { recursive: true })
      await page.context().storageState({ path: storageStatePath })
    }

    await use(page)
  },
})

export { expect }
