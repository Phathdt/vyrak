import { StorageHelper } from '@helpers/storage.helper'
import { LoginPage } from '@page-objects/auth/login.page'
import { expect, test } from '@playwright/test'

test.describe('Login Flow', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.navigate()
  })

  test('should display login page correctly', async () => {
    await loginPage.expectOnLoginPage()
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    const testUser = {
      email: process.env.TEST_USER_EMAIL || 'admin@vyrak.dev',
      password: process.env.TEST_USER_PASSWORD || 'Password123!',
    }

    await loginPage.fillAndSubmit(testUser.email, testUser.password)
    await loginPage.expectRedirectedToHome()

    // Verify token is stored
    const token = await StorageHelper.getAuthToken(page)
    expect(token).toBeTruthy()
  })

  test('should show error with invalid credentials', async () => {
    await loginPage.fillAndSubmit('invalid@example.com', 'WrongPassword123!')
    await loginPage.expectErrorVisible(/invalid|incorrect|failed|wrong/i)
  })

  test('should show error with empty email', async () => {
    await loginPage.fillPassword('SomePassword123!')
    await loginPage.clickSubmit()

    // Depending on implementation, might show validation or disable submit
    await test.step('verify email validation', async () => {
      const isDisabled = await loginPage
        .expectSubmitDisabled()
        .then(() => true)
        .catch(() => false)
      if (!isDisabled) {
        await loginPage.expectEmailError()
      }
    })
  })

  test('should show error with empty password', async () => {
    await loginPage.fillEmail('test@example.com')
    await loginPage.clickSubmit()

    await test.step('verify password validation', async () => {
      const isDisabled = await loginPage
        .expectSubmitDisabled()
        .then(() => true)
        .catch(() => false)
      if (!isDisabled) {
        await loginPage.expectPasswordError()
      }
    })
  })

  test('should show error with invalid email format', async () => {
    // Fill with invalid email format
    await loginPage.fillEmail('not-an-email')
    await loginPage.fillPassword('Password123!')

    await test.step('verify email format validation', async () => {
      // HTML5 email validation prevents submit - check button is still enabled
      // (no error message shown, but form won't submit)
      await loginPage.expectSubmitEnabled()

      // Try to submit - browser's HTML5 validation prevents it
      await loginPage.clickSubmit()

      // Should still be on login page (submit didn't happen)
      await loginPage.expectOnLoginPage()
    })
  })

  test('should navigate to register page', async ({ page }) => {
    await loginPage.clickRegisterLink()
    await expect(page).toHaveURL(/\/signup/)
  })
})
