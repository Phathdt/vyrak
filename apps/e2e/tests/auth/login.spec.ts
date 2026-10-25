import { test, expect } from '@playwright/test'
import { LoginPage } from '@page-objects/auth/login.page'
import { StorageHelper } from '@helpers/storage.helper'

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
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'Test123456!',
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
      const isDisabled = await loginPage.expectSubmitDisabled().then(() => true).catch(() => false)
      if (!isDisabled) {
        await loginPage.expectEmailError()
      }
    })
  })

  test('should show error with empty password', async () => {
    await loginPage.fillEmail('test@example.com')
    await loginPage.clickSubmit()

    await test.step('verify password validation', async () => {
      const isDisabled = await loginPage.expectSubmitDisabled().then(() => true).catch(() => false)
      if (!isDisabled) {
        await loginPage.expectPasswordError()
      }
    })
  })

  test('should show error with invalid email format', async () => {
    await loginPage.fillAndSubmit('not-an-email', 'Password123!')

    await test.step('verify email format validation', async () => {
      // Either submit is disabled or error is shown
      const isDisabled = await loginPage.expectSubmitDisabled().then(() => true).catch(() => false)
      if (!isDisabled) {
        await loginPage.expectErrorVisible()
      }
    })
  })

  test('should navigate to register page', async ({ page }) => {
    await loginPage.clickRegisterLink()
    await expect(page).toHaveURL(/\/register/)
  })
})
