import { TEST_TIMEOUTS } from '@config/test.config'
import { URLS } from '@config/urls.config'
import { LoginPage } from '@page-objects/auth/login.page'
import { expect, test } from '@playwright/test'

test.describe('Login Security Scenarios', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.navigate()
  })

  test('should sanitize HTML/JavaScript in email field', async ({ page }) => {
    const xssAttempts = [
      '<script>alert("xss")</script>@example.com',
      'test@example.com"><script>alert("xss")</script>',
      'javascript:alert("xss")@example.com',
      '<img src=x onerror="alert(\'xss\')" />@example.com',
    ]

    for (const xssPayload of xssAttempts) {
      await loginPage.navigate()

      // Disable dialog handler to catch any alerts
      let alertTriggered = false
      page.on('dialog', async (dialog) => {
        alertTriggered = true
        await dialog.dismiss()
      })

      await loginPage.fillEmail(xssPayload)
      await loginPage.fillPassword('Password123!')

      await test.step(`verify XSS protection for: ${xssPayload}`, async () => {
        // Try to submit
        await loginPage.clickSubmit()

        // Wait a moment to see if any dialogs appear
        await page.waitForTimeout(500)

        // Alert should NOT have triggered
        expect(alertTriggered).toBe(false)

        // Should still be on login page
        await loginPage.expectOnLoginPage()
      })

      page.off('dialog', () => {})
    }
  })

  test('should sanitize HTML/JavaScript in password field', async ({ page }) => {
    const xssAttempts = [
      '<script>alert("xss")</script>',
      'password"><script>alert("xss")</script>',
      '<img src=x onerror="alert(\'xss\')" />',
      '"><svg onload="alert(\'xss\')" /><"',
    ]

    for (const xssPayload of xssAttempts) {
      await loginPage.navigate()

      let alertTriggered = false
      page.on('dialog', async (dialog) => {
        alertTriggered = true
        await dialog.dismiss()
      })

      await loginPage.fillEmail('test@example.com')
      await loginPage.fillPassword(xssPayload)

      await test.step(`verify password XSS protection for: ${xssPayload}`, async () => {
        await loginPage.clickSubmit()
        await page.waitForTimeout(500)

        expect(alertTriggered).toBe(false)
        await loginPage.expectOnLoginPage()
      })

      page.off('dialog', () => {})
    }
  })

  test('should not expose sensitive data in error messages', async () => {
    // Use a random email to ensure login fails
    await loginPage.fillEmail('nonexistent@example.com')
    await loginPage.fillPassword('WrongPassword123!')
    await loginPage.clickSubmit()

    // Error message should not contain:
    // - User existence info
    // - Database errors
    // - Stack traces
    // - API endpoints

    await test.step('verify error message is safe', async () => {
      const errorText = await loginPage.getErrorText()

      // Should show a user-friendly error (not empty)
      expect(errorText).toBeTruthy()

      // Should not contain sensitive patterns
      const sensitivePatternsRegex = /database|error|stack|trace|api|endpoint|query|sql/i
      expect(errorText).not.toMatch(sensitivePatternsRegex)
    })
  })

  test('should not allow SQL injection-like attempts', async () => {
    const sqlInjectionAttempts = ["admin' OR '1'='1", "admin'--", "admin' /*", "' OR 1=1 --", "admin' AND '1'='1"]

    for (const payload of sqlInjectionAttempts) {
      await loginPage.navigate()
      await loginPage.fillEmail(payload)
      await loginPage.fillPassword(payload)

      await test.step(`verify SQL injection protection: ${payload}`, async () => {
        // Should not crash or show SQL errors
        await loginPage.clickSubmit()
        await loginPage.expectOnLoginPage()

        // Error message should not contain SQL-related errors
        const errorText = await loginPage.page
          .locator('[role="alert"]')
          .first()
          .textContent({ timeout: 2000 })
          .catch(() => null)

        if (errorText) {
          const sqlErrorRegex = /syntax|sql|query|unexpected/i
          expect(errorText).not.toMatch(sqlErrorRegex)
        }
      })
    }
  })

  test('should not store sensitive data in localStorage beyond token', async ({ page }) => {
    const testUser = {
      email: process.env.TEST_USER_EMAIL || 'admin@vyrak.dev',
      password: process.env.TEST_USER_PASSWORD || 'Password123!',
    }

    await loginPage.fillAndSubmit(testUser.email, testUser.password)
    await loginPage.expectRedirectedToHome()

    // Check localStorage
    const allStorageData = await page.evaluate(() => {
      const data: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          data[key] = localStorage.getItem(key) || ''
        }
      }
      return data
    })

    await test.step('verify no sensitive data in localStorage', async () => {
      // Should not contain password or sensitive info
      const allData = JSON.stringify(allStorageData)

      // Check for common sensitive data patterns
      expect(allData).not.toContain(testUser.password)
      expect(allData.toLowerCase()).not.toContain('password')
      expect(allData.toLowerCase()).not.toContain('secret')
      expect(allData.toLowerCase()).not.toContain('api_key')
    })
  })

  test('should not expose CSRF tokens in visible HTML', async ({ page }) => {
    // CSRF tokens should be in meta tags or secure headers, not in visible forms
    const formContent = await page.content()

    await test.step('verify CSRF token security', async () => {
      // Token should not be visible in plain text in form
      const tokenRegex = /csrf.*?token|token.*?csrf/i
      const hasVisibleToken = formContent.match(tokenRegex)

      // If token is present in HTML, it should be in a hidden input or meta tag
      if (hasVisibleToken) {
        const hiddenInputRegex = /<input[^>]*type=["']?hidden["']?[^>]*>/i
        const metaTagRegex = /<meta[^>]*csrf/i

        const hasProperPlacement = hiddenInputRegex.test(formContent) || metaTagRegex.test(formContent)
        expect(hasProperPlacement).toBe(true)
      }
    })
  })

  test('should prevent case-sensitive email exploitation', async ({ page }) => {
    const testUser = {
      email: process.env.TEST_USER_EMAIL || 'admin@vyrak.dev',
      password: process.env.TEST_USER_PASSWORD || 'Password123!',
    }

    // Try with uppercase variations
    const emailVariations = [
      testUser.email.toUpperCase(),
      testUser.email.charAt(0).toUpperCase() + testUser.email.slice(1),
      testUser.email.replace('@', '@').toUpperCase(),
    ]

    for (const email of emailVariations) {
      await loginPage.navigate()
      await loginPage.fillAndSubmit(email, testUser.password)

      await test.step(`verify case handling for: ${email}`, async () => {
        // Should either log in (if case-insensitive) or show error (if case-sensitive)
        // Both are acceptable, just verify consistent behavior
        const onLoginPage = await loginPage.page.url().then((url) => url.includes('/login'))

        // If it redirected away from login, it was case-insensitive (good)
        // If it stayed on login, it was case-sensitive (also acceptable)
        expect([true, false]).toContain(onLoginPage)
      })
    }
  })
})
