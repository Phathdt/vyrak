import { TestDataFactory } from '@fixtures/test-data.fixture'
import { StorageHelper } from '@helpers/storage.helper'
import { RegisterPage } from '@page-objects/auth/register.page'
import { expect, test } from '@playwright/test'

test.describe('Registration Flow', () => {
  let registerPage: RegisterPage

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page)
    await registerPage.navigate()
  })

  test('should display register page correctly', async () => {
    await registerPage.expectOnRegisterPage()
  })

  test('should register new user successfully', async ({ page }) => {
    const newUser = TestDataFactory.createUser()

    await registerPage.registerUser(newUser.email, newUser.password)
    await registerPage.expectRedirectedToHome()

    // Verify token is stored
    const token = await StorageHelper.getAuthToken(page)
    expect(token).toBeTruthy()
  })

  test('should show error when registering with existing email', async () => {
    const existingUser = {
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: TestDataFactory.validPassword(),
    }

    await registerPage.registerUser(existingUser.email, existingUser.password)
    await registerPage.expectErrorVisible(/already exists|already registered|email taken/i)
  })

  test('should show error with invalid email format', async () => {
    await registerPage.registerUser('not-an-email', 'Password123!')

    // Should show validation error or disable submit
    await test.step('verify email validation', async () => {
      try {
        await registerPage.expectErrorVisible()
      } catch {
        // Form validation might prevent submit instead
        await registerPage.expectOnRegisterPage()
      }
    })
  })

  test('should show error with weak password', async () => {
    const user = TestDataFactory.createUser({ password: '123' })

    await registerPage.registerUser(user.email, user.password)
    await registerPage.expectErrorVisible(/password.*too short|password.*weak|password.*invalid/i)
  })

  test('should navigate to login page', async ({ page }) => {
    await page.getByRole('link', { name: /sign in|log in|login/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
