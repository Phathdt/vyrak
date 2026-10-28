import { expect, test } from '@fixtures/auth.fixture'
import { StorageHelper } from '@helpers/storage.helper'
import { LoginPage } from '@page-objects/auth/login.page'
import { DashboardPage } from '@page-objects/dashboard/dashboard.page'

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
    const tokenBefore = await StorageHelper.getAuthToken(authenticatedPage)
    expect(tokenBefore).toBeTruthy()

    await dashboardPage.clickLogout()

    const loginPage = new LoginPage(authenticatedPage)
    await loginPage.expectOnLoginPage()

    const tokenAfter = await StorageHelper.getAuthToken(authenticatedPage)
    expect(tokenAfter).toBeNull()
  })

  test('should maintain session after page reload', async ({ authenticatedPage }) => {
    await dashboardPage.expectOnDashboard()

    await dashboardPage.reload()

    await dashboardPage.expectOnDashboard()

    const token = await StorageHelper.getAuthToken(authenticatedPage)
    expect(token).toBeTruthy()
  })
})
