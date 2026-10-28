import { TEST_TIMEOUTS } from '@config/test.config'
import { StorageHelper } from '@helpers/storage.helper'
import { LoginPage } from '@page-objects/auth/login.page'
import { expect, test } from '@playwright/test'

test.describe('Login Edge Cases', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.navigate()
  })

  test('should handle very long email input gracefully', async ({ page }) => {
    const veryLongEmail = `${'a'.repeat(250)}@example.com`
    await loginPage.fillEmail(veryLongEmail)
    await loginPage.fillPassword('Password123!')

    // Should either be disabled or show validation error
    await test.step('verify handling of long email', async () => {
      const isDisabled = await loginPage
        .expectSubmitDisabled()
        .then(() => true)
        .catch(() => false)

      if (!isDisabled) {
        // If submit is still enabled, clicking it should not break the app
        await loginPage.clickSubmit()
        // Should show error or stay on login page
        await loginPage.expectOnLoginPage()
      }
    })
  })

  test('should handle very long password input gracefully', async () => {
    const veryLongPassword = 'a'.repeat(500)
    await loginPage.fillEmail('test@example.com')
    await loginPage.fillPassword(veryLongPassword)

    await test.step('verify handling of long password', async () => {
      // Should either be disabled or handle gracefully
      const isDisabled = await loginPage
        .expectSubmitDisabled()
        .then(() => true)
        .catch(() => false)

      if (!isDisabled) {
        await loginPage.clickSubmit()
        // Should not crash, should show error
        await loginPage.expectOnLoginPage()
      }
    })
  })

  test('should handle email with leading/trailing whitespace', async ({ page }) => {
    const testUser = {
      email: process.env.TEST_USER_EMAIL || 'admin@vyrak.dev',
      password: process.env.TEST_USER_PASSWORD || 'Password123!',
    }

    // Try with leading/trailing spaces
    await loginPage.fillEmail(`  ${testUser.email}  `)
    await loginPage.fillPassword(testUser.password)

    await test.step('verify whitespace handling', async () => {
      // App might trim spaces (good) or reject (acceptable)
      const isDisabled = await loginPage
        .expectSubmitDisabled()
        .then(() => true)
        .catch(() => false)

      if (!isDisabled) {
        await loginPage.clickSubmit()

        // Wait a bit for result
        await page.waitForTimeout(500)

        // Check if logged in (if app trims) or shows error (if app doesn't trim)
        const isLoggedIn = await StorageHelper.isAuthenticated(page)

        if (!isLoggedIn) {
          await loginPage.expectOnLoginPage()
        } else {
          await loginPage.expectRedirectedToHome()
        }
      }
    })
  })

  test('should handle email with special characters (+)', async ({ page }) => {
    await loginPage.navigate()
    await loginPage.fillEmail('test+tag@example.com')
    await loginPage.fillPassword('Password123!')

    const isDisabled = await loginPage
      .expectSubmitDisabled()
      .then(() => true)
      .catch(() => false)

    if (!isDisabled) {
      await loginPage.clickSubmit()
      await page.waitForTimeout(300)
      const isOnLogin = page.url().includes('/login')
      expect(isOnLogin).toBe(true)
    }
  })

  test('should handle email with dot notation', async ({ page }) => {
    await loginPage.navigate()
    await loginPage.fillEmail('test.name@example.com')
    await loginPage.fillPassword('Password123!')

    const isDisabled = await loginPage
      .expectSubmitDisabled()
      .then(() => true)
      .catch(() => false)

    if (!isDisabled) {
      await loginPage.clickSubmit()
      await page.waitForTimeout(300)
      const isOnLogin = page.url().includes('/login')
      expect(isOnLogin).toBe(true)
    }
  })

  test('should handle email with underscore', async ({ page }) => {
    await loginPage.navigate()
    await loginPage.fillEmail('test_name@example.com')
    await loginPage.fillPassword('Password123!')

    const isDisabled = await loginPage
      .expectSubmitDisabled()
      .then(() => true)
      .catch(() => false)

    if (!isDisabled) {
      await loginPage.clickSubmit()
      await page.waitForTimeout(300)
      const isOnLogin = page.url().includes('/login')
      expect(isOnLogin).toBe(true)
    }
  })

  test('should handle email with hyphen', async ({ page }) => {
    await loginPage.navigate()
    await loginPage.fillEmail('test-name@example.com')
    await loginPage.fillPassword('Password123!')

    const isDisabled = await loginPage
      .expectSubmitDisabled()
      .then(() => true)
      .catch(() => false)

    if (!isDisabled) {
      await loginPage.clickSubmit()
      await page.waitForTimeout(300)
      const isOnLogin = page.url().includes('/login')
      expect(isOnLogin).toBe(true)
    }
  })

  test('should handle password with special chars !@#$%', async ({ page }) => {
    await loginPage.navigate()
    await loginPage.fillEmail('nonexistent@example.com')
    await loginPage.fillPassword('Pass!@#$%^&*()')

    const isDisabled = await loginPage
      .expectSubmitDisabled()
      .then(() => true)
      .catch(() => false)

    if (!isDisabled) {
      await loginPage.clickSubmit()
      await page.waitForTimeout(300)
      const isOnLogin = page.url().includes('/login')
      expect(isOnLogin).toBe(true)
    }
  })

  test('should handle password with special chars <>?', async ({ page }) => {
    await loginPage.navigate()
    await loginPage.fillEmail('nonexistent@example.com')
    await loginPage.fillPassword('Pass<>?:"{}|')

    const isDisabled = await loginPage
      .expectSubmitDisabled()
      .then(() => true)
      .catch(() => false)

    if (!isDisabled) {
      await loginPage.clickSubmit()
      await page.waitForTimeout(300)
      const isOnLogin = page.url().includes('/login')
      expect(isOnLogin).toBe(true)
    }
  })

  test('should handle password with quotes and dashes', async ({ page }) => {
    await loginPage.navigate()
    await loginPage.fillEmail('nonexistent@example.com')
    await loginPage.fillPassword('Pass\'";--')

    const isDisabled = await loginPage
      .expectSubmitDisabled()
      .then(() => true)
      .catch(() => false)

    if (!isDisabled) {
      await loginPage.clickSubmit()
      await page.waitForTimeout(300)
      const isOnLogin = page.url().includes('/login')
      expect(isOnLogin).toBe(true)
    }
  })

  test('should handle password with backticks and brackets', async ({ page }) => {
    await loginPage.navigate()
    await loginPage.fillEmail('nonexistent@example.com')
    await loginPage.fillPassword('Pass`~[]\\/')

    const isDisabled = await loginPage
      .expectSubmitDisabled()
      .then(() => true)
      .catch(() => false)

    if (!isDisabled) {
      await loginPage.clickSubmit()
      await page.waitForTimeout(300)
      const isOnLogin = page.url().includes('/login')
      expect(isOnLogin).toBe(true)
    }
  })

  test('should handle rapid input changes without crashing', async () => {
    const email = 'test@example.com'
    const password = 'TestPassword123!'

    // Rapidly change inputs
    for (let i = 0; i < 5; i++) {
      await loginPage.fillEmail(email + i)
      await loginPage.fillPassword(password + i)
      await loginPage.fillEmail(email)
      await loginPage.fillPassword(password)
    }

    // Should still be able to submit
    await loginPage.clickSubmit()

    // Should either show error or process normally
    await loginPage.expectOnLoginPage()
  })

  test('should handle Chinese Unicode characters', async ({ page }) => {
    await loginPage.navigate()
    await loginPage.fillEmail('测试@example.com')
    await loginPage.fillPassword('Password123!')

    const isDisabled = await loginPage
      .expectSubmitDisabled()
      .then(() => true)
      .catch(() => false)

    if (!isDisabled) {
      await loginPage.clickSubmit()
      await page.waitForTimeout(300)
      const isOnLogin = page.url().includes('/login')
      expect(isOnLogin).toBe(true)
    }
  })

  test('should handle Cyrillic Unicode characters', async ({ page }) => {
    await loginPage.navigate()
    await loginPage.fillEmail('тест@example.com')
    await loginPage.fillPassword('Password123!')

    const isDisabled = await loginPage
      .expectSubmitDisabled()
      .then(() => true)
      .catch(() => false)

    if (!isDisabled) {
      await loginPage.clickSubmit()
      await page.waitForTimeout(300)
      const isOnLogin = page.url().includes('/login')
      expect(isOnLogin).toBe(true)
    }
  })

  test('should handle Japanese Unicode domain', async ({ page }) => {
    await loginPage.navigate()
    await loginPage.fillEmail('test@例え.jp')
    await loginPage.fillPassword('Password123!')

    const isDisabled = await loginPage
      .expectSubmitDisabled()
      .then(() => true)
      .catch(() => false)

    if (!isDisabled) {
      await loginPage.clickSubmit()
      await page.waitForTimeout(300)
      const isOnLogin = page.url().includes('/login')
      expect(isOnLogin).toBe(true)
    }
  })

  test('should handle only spaces in fields', async () => {
    await loginPage.fillEmail('     ')
    await loginPage.fillPassword('     ')

    await test.step('verify spaces-only handling', async () => {
      // Should be disabled or show validation error
      const isDisabled = await loginPage
        .expectSubmitDisabled()
        .then(() => true)
        .catch(() => false)

      if (!isDisabled) {
        await loginPage.clickSubmit()
        await loginPage.expectOnLoginPage()
      }
    })
  })
})
