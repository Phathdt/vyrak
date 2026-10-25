import { URLS } from '@config/urls.config'
import { StorageHelper } from '@helpers/storage.helper'
import { LoginPage } from '@page-objects/auth/login.page'
import { expect, test } from '@playwright/test'

test.describe('Session Persistence', () => {
  const testUser = {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'Test123456!',
  }

  test('should persist session after page reload', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.navigate()
    await loginPage.fillAndSubmit(testUser.email, testUser.password)
    await loginPage.expectRedirectedToHome()

    // Get token before reload
    const tokenBefore = await StorageHelper.getAuthToken(page)
    expect(tokenBefore).toBeTruthy()

    // Reload page
    await page.reload()

    // Verify still authenticated
    const tokenAfter = await StorageHelper.getAuthToken(page)
    expect(tokenAfter).toBe(tokenBefore)

    // Should not redirect to login
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('should persist session in new tab', async ({ context, page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.navigate()
    await loginPage.fillAndSubmit(testUser.email, testUser.password)
    await loginPage.expectRedirectedToHome()

    // Open new tab
    const newPage = await context.newPage()
    await newPage.goto(URLS.ROUTES.HOME)

    // Should be authenticated in new tab
    const token = await StorageHelper.getAuthToken(newPage)
    expect(token).toBeTruthy()

    await expect(newPage).not.toHaveURL(/\/login/)
    await newPage.close()
  })

  test('should clear session after logout', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.navigate()
    await loginPage.fillAndSubmit(testUser.email, testUser.password)
    await loginPage.expectRedirectedToHome()

    // Verify authenticated
    const tokenBefore = await StorageHelper.getAuthToken(page)
    expect(tokenBefore).toBeTruthy()

    // Logout (assuming logout button exists)
    const logoutButton = page.getByRole('button', { name: /log ?out|sign ?out/i })
    await logoutButton.click()

    // Wait for redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })

    // Verify token is cleared
    const tokenAfter = await StorageHelper.getAuthToken(page)
    expect(tokenAfter).toBeNull()
  })
})
