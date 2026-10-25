import { StorageHelper } from '@helpers/storage.helper'
import { LoginPage } from '@page-objects/auth/login.page'
import { DashboardPage } from '@page-objects/dashboard/dashboard.page'
import { expect, test } from '@playwright/test'

test.describe('Login to Dashboard Flow', () => {
  test('should complete full login flow and access dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const dashboardPage = new DashboardPage(page)

    const testUser = {
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'Test123456!',
    }

    // Step 1: Navigate to login
    await loginPage.navigate()
    await loginPage.expectOnLoginPage()

    // Step 2: Fill credentials
    await loginPage.fillAndSubmit(testUser.email, testUser.password)

    // Step 3: Should redirect to dashboard
    await dashboardPage.expectOnDashboard()

    // Step 4: Verify token stored
    const token = await StorageHelper.getAuthToken(page)
    expect(token).toBeTruthy()

    // Step 5: Dashboard content should be visible
    await dashboardPage.expectMainContentVisible()
  })
})
