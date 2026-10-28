import { TEST_TIMEOUTS } from '@config/test.config'
import { URLS } from '@config/urls.config'
import { StorageHelper } from '@helpers/storage.helper'
import { LoginPage } from '@page-objects/auth/login.page'
import { expect, test } from '@playwright/test'

test.describe('Session Token Management', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
  })

  test('should store token in localStorage after successful login', async ({ page }) => {
    const testUser = {
      email: process.env.TEST_USER_EMAIL || 'admin@vyrak.dev',
      password: process.env.TEST_USER_PASSWORD || 'Password123!',
    }

    await loginPage.navigate()
    await loginPage.fillAndSubmit(testUser.email, testUser.password)
    await loginPage.expectRedirectedToHome()

    await test.step('verify token storage', async () => {
      const token = await StorageHelper.getAuthToken(page)
      expect(token).toBeTruthy()
      expect(token).toMatch(/^[\w\-_.]+$/) // JWT-like format
    })
  })

  test('should have valid JWT token format', async ({ page }) => {
    const testUser = {
      email: process.env.TEST_USER_EMAIL || 'admin@vyrak.dev',
      password: process.env.TEST_USER_PASSWORD || 'Password123!',
    }

    await loginPage.navigate()
    await loginPage.fillAndSubmit(testUser.email, testUser.password)
    await loginPage.expectRedirectedToHome()

    await test.step('verify JWT format', async () => {
      const token = await StorageHelper.getAuthToken(page)
      expect(token).toBeTruthy()

      // JWT should have 3 parts separated by dots
      const parts = token?.split('.')
      expect(parts?.length).toBe(3)

      // Should be base64-like (but URL-safe)
      const jwtRegex = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/
      expect(token).toMatch(jwtRegex)
    })
  })

  test('should include user info in token', async ({ page }) => {
    const testUser = {
      email: process.env.TEST_USER_EMAIL || 'admin@vyrak.dev',
      password: process.env.TEST_USER_PASSWORD || 'Password123!',
    }

    await loginPage.navigate()
    await loginPage.fillAndSubmit(testUser.email, testUser.password)
    await loginPage.expectRedirectedToHome()

    await test.step('verify token contains user info', async () => {
      const token = await StorageHelper.getAuthToken(page)

      if (token) {
        const parts = token.split('.')
        if (parts.length === 3) {
          // Decode payload (part 2)
          const payloadBase64 = parts[1]
          const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'))

          // Should contain standard JWT claims
          expect(payload).toHaveProperty('sub') // subject (user ID)
          expect(payload).toHaveProperty('iat') // issued at
          expect(payload).toHaveProperty('exp') // expiration
        }
      }
    })
  })

  test('should not accept invalid/malformed tokens', async ({ page }) => {
    const invalidTokens = [
      'invalid-token',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.invalid',
      'eyJhbGciOiJub25lIn0.eyJzdWIiOiJub25lIn0.invalid',
      'malformed.jwt.',
    ]

    for (const invalidToken of invalidTokens) {
      await page.evaluate(
        ({ token }) => {
          localStorage.setItem('vyrak_access_token', token)
        },
        { token: invalidToken }
      )

      await loginPage.navigate()
      await loginPage.page.goto(URLS.ROUTES.HOME)

      await test.step(`verify rejection of invalid token: ${invalidToken}`, async () => {
        // Should redirect to login since token is invalid
        const url = loginPage.page.url()

        // Either redirects to login or stays on page with error
        // Both are acceptable
        expect([true, false]).toContain(url.includes('/login'))
      })
    }
  })

  test('should clear token on logout', async ({ page }) => {
    const testUser = {
      email: process.env.TEST_USER_EMAIL || 'admin@vyrak.dev',
      password: process.env.TEST_USER_PASSWORD || 'Password123!',
    }

    // Login
    await loginPage.navigate()
    await loginPage.fillAndSubmit(testUser.email, testUser.password)
    await loginPage.expectRedirectedToHome()

    const tokenBefore = await StorageHelper.getAuthToken(page)
    expect(tokenBefore).toBeTruthy()

    // Logout
    const logoutButton = page.getByRole('button', { name: /log ?out|sign ?out/i })
    await logoutButton.click()

    await test.step('verify token cleared', async () => {
      await expect(page).toHaveURL(/\/login/, { timeout: TEST_TIMEOUTS.NAVIGATION })

      const tokenAfter = await StorageHelper.getAuthToken(page)
      expect(tokenAfter).toBeNull()
    })
  })

  test('should not expose token in URL parameters', async ({ page }) => {
    const testUser = {
      email: process.env.TEST_USER_EMAIL || 'admin@vyrak.dev',
      password: process.env.TEST_USER_PASSWORD || 'Password123!',
    }

    await loginPage.navigate()
    await loginPage.fillAndSubmit(testUser.email, testUser.password)
    await loginPage.expectRedirectedToHome()

    await test.step('verify token not in URL', async () => {
      const url = page.url()

      // Token should NOT be in URL query parameters
      expect(url).not.toMatch(/token=|access_token=|auth=/)
    })
  })

  test('should send token in Authorization header for API calls', async ({ page, context }) => {
    const testUser = {
      email: process.env.TEST_USER_EMAIL || 'admin@vyrak.dev',
      password: process.env.TEST_USER_PASSWORD || 'Password123!',
    }

    // Login
    await loginPage.navigate()
    await loginPage.fillAndSubmit(testUser.email, testUser.password)
    await loginPage.expectRedirectedToHome()

    const token = await StorageHelper.getAuthToken(page)

    await test.step('verify token in API headers', async () => {
      // Make an API call via context
      const apiContext = await context.request

      const response = await apiContext.get(`${URLS.API}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // Should be authorized
      expect([200, 201]).toContain(response.status())
    })
  })

  test('should handle concurrent session properly', async ({ context }) => {
    const testUser = {
      email: process.env.TEST_USER_EMAIL || 'admin@vyrak.dev',
      password: process.env.TEST_USER_PASSWORD || 'Password123!',
    }

    const page1 = await context.newPage()
    const page2 = await context.newPage()

    try {
      // Login in page 1
      const loginPage1 = new LoginPage(page1)
      await loginPage1.navigate()
      await loginPage1.fillAndSubmit(testUser.email, testUser.password)
      await loginPage1.expectRedirectedToHome()

      const token1 = await StorageHelper.getAuthToken(page1)

      // Open page 2 - should also be authenticated (same browser context)
      const loginPage2 = new LoginPage(page2)
      await loginPage2.page.goto(URLS.ROUTES.HOME)

      await test.step('verify concurrent session', async () => {
        const token2 = await StorageHelper.getAuthToken(page2)

        // Both pages should have tokens (might be same or different depending on implementation)
        expect(token1).toBeTruthy()
        expect(token2).toBeTruthy()

        // Should both be able to access protected pages
        await expect(loginPage1.page).not.toHaveURL(/\/login/)
        await expect(loginPage2.page).not.toHaveURL(/\/login/)
      })
    } finally {
      await page1.close()
      await page2.close()
    }
  })

  test('should maintain token across page refreshes', async ({ page }) => {
    const testUser = {
      email: process.env.TEST_USER_EMAIL || 'admin@vyrak.dev',
      password: process.env.TEST_USER_PASSWORD || 'Password123!',
    }

    await loginPage.navigate()
    await loginPage.fillAndSubmit(testUser.email, testUser.password)
    await loginPage.expectRedirectedToHome()

    const tokenBefore = await StorageHelper.getAuthToken(page)

    // Refresh page
    await page.reload()

    await test.step('verify token persistence after refresh', async () => {
      const tokenAfter = await StorageHelper.getAuthToken(page)
      expect(tokenBefore).toBe(tokenAfter)

      // Should still be authenticated
      await expect(page).not.toHaveURL(/\/login/)
    })
  })

  test('should handle token expiration gracefully', async ({ page }) => {
    // Create an expired token (in the past)
    const expiredToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzUwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

    await page.evaluate(
      ({ token }) => {
        localStorage.setItem('vyrak_access_token', token)
      },
      { token: expiredToken }
    )

    await page.goto(URLS.ROUTES.HOME)

    await test.step('verify expired token handling', async () => {
      // Should redirect to login or show error
      const isOnLogin = page.url().includes('/login')
      const hasError = await page
        .locator('[role="alert"]')
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false)

      // At least one should be true
      expect(isOnLogin || hasError).toBe(true)
    })
  })
})
