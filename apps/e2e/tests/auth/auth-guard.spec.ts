import { URLS } from '@config/urls.config'
import { expect, test } from '@playwright/test'

test.describe('Authentication Guards', () => {
  test.describe('Unauthenticated User', () => {
    test('should redirect to login when accessing dashboard', async ({ page }) => {
      await page.goto(URLS.ROUTES.DASHBOARD)

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
    })

    test('should allow access to login page', async ({ page }) => {
      await page.goto(URLS.ROUTES.LOGIN)
      await expect(page).toHaveURL(/\/login/)
    })

    test('should allow access to register page', async ({ page }) => {
      await page.goto(URLS.ROUTES.REGISTER)
      await expect(page).toHaveURL(/\/register/)
    })
  })

  test.describe('Authenticated User', () => {
    test.use({
      storageState: 'test-results/.auth/user.json',
    })

    test('should access dashboard', async ({ page }) => {
      await page.goto(URLS.ROUTES.DASHBOARD)

      // Should NOT redirect to login
      await expect(page).not.toHaveURL(/\/login/)
    })

    test('should redirect from login to dashboard if already authenticated', async ({ page }) => {
      await page.goto(URLS.ROUTES.LOGIN)

      // Should redirect away from login
      await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 })
    })
  })
})
