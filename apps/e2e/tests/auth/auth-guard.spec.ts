import { URLS } from '@config/urls.config'
import { expect, test } from '@fixtures/auth.fixture'

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
  })

  test.describe('Authenticated User', () => {
    test('should access dashboard', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(URLS.ROUTES.DASHBOARD)

      // Should NOT redirect to login
      await expect(authenticatedPage).not.toHaveURL(/\/login/)
    })

    test('should redirect from login to dashboard if already authenticated', async ({ authenticatedPage }) => {
      await authenticatedPage.goto(URLS.ROUTES.LOGIN)

      // Should redirect away from login
      await expect(authenticatedPage).not.toHaveURL(/\/login/, { timeout: 10000 })
    })
  })
})
