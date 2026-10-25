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

  await page.getByPlaceholder(/email/i).fill(email)
  await page.getByPlaceholder(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in|log in|login/i }).click()

  // Wait for redirect after successful login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 })

  // Get token from localStorage
  const token = await page.evaluate(() => localStorage.getItem('token'))

  if (!token) {
    throw new Error('Failed to retrieve auth token after login')
  }

  return token
}

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  testUser: async ({}, use) => {
    // Use env vars or default test user
    const user: AuthUser = {
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'Test123456!',
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
      const token = await page.evaluate(() => localStorage.getItem('token'))

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
