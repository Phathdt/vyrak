import { test, expect } from '@fixtures/auth.fixture'
import { DashboardPage } from '@page-objects/dashboard/dashboard.page'
import { LoginPage } from '@page-objects/auth/login.page'
import { StorageHelper } from '@helpers/storage.helper'

test.describe('Dashboard', () => {
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage)
    await dashboardPage.navigate()
  })

  test('should display dashboard after login', async () => {
    await dashboardPage.expectOnDashboard()
  })

  test('should show welcome message', async () => {
    await dashboardPage.expectWelcomeMessageVisible()
  })

  test('should show main content', async () => {
    await dashboardPage.expectMainContentVisible()
  })

  test('should show logout button', async () => {
    await dashboardPage.expectLogoutButtonVisible()
  })

  test('should logout and redirect to login', async ({ authenticatedPage }) => {
    // Verify authenticated first
    const tokenBefore = await StorageHelper.getAuthToken(authenticatedPage)
    expect(tokenBefore).toBeTruthy()

    // Click logout
    await dashboardPage.clickLogout()

    // Should redirect to login
    const loginPage = new LoginPage(authenticatedPage)
    await loginPage.expectOnLoginPage()

    // Token should be cleared
    const tokenAfter = await StorageHelper.getAuthToken(authenticatedPage)
    expect(tokenAfter).toBeNull()
  })

  test('should maintain session after page reload', async ({ authenticatedPage }) => {
    await dashboardPage.expectOnDashboard()

    // Reload page
    await authenticatedPage.reload()

    // Should still be on dashboard
    await dashboardPage.expectOnDashboard()

    // Token should still exist
    const token = await StorageHelper.getAuthToken(authenticatedPage)
    expect(token).toBeTruthy()
  })
})
