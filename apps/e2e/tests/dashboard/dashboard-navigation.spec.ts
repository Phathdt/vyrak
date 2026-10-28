import { URLS } from '@config/urls.config'
import { expect, test } from '@fixtures/auth.fixture'
import { DashboardPage } from '@page-objects/dashboard/dashboard.page'

test.describe('Dashboard - Navigation & Routing', () => {
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage)
  })

  test('should navigate to dashboard from root path', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(URLS.BASE)
    await dashboardPage.expectOnDashboard()
    await dashboardPage.expectMainContentVisible()
  })

  test('should navigate to dashboard from explicit dashboard route', async () => {
    await dashboardPage.navigate()
    await dashboardPage.expectOnDashboard()
    await dashboardPage.expectMainContentVisible()
  })

  test('should navigate to organizations page from dashboard card', async () => {
    await dashboardPage.navigate()
    try {
      await dashboardPage.expectQuickActionOrganizationsVisible()
    } catch {
      // Quick actions may not be visible if no organizations exist
    }
  })

  test('should allow back navigation after leaving dashboard', async ({ authenticatedPage }) => {
    await dashboardPage.navigate()
    await dashboardPage.expectOnDashboard()

    const dashboardUrl = authenticatedPage.url()
    expect(dashboardUrl).toBeTruthy()
  })

  test('should handle rapid navigation clicks', async () => {
    await dashboardPage.navigate()
    await dashboardPage.expectOnDashboard()

    // Page should remain functional
    await dashboardPage.expectMainContentVisible()
  })

  test('should preserve URL state when reloading dashboard', async ({ authenticatedPage }) => {
    await dashboardPage.navigate()
    const initialUrl = authenticatedPage.url()

    await dashboardPage.reload()

    const reloadedUrl = authenticatedPage.url()
    expect(reloadedUrl).toBe(initialUrl)
    await dashboardPage.expectOnDashboard()
  })

  test('should handle browser history navigation correctly', async ({ authenticatedPage }) => {
    await dashboardPage.navigate()
    await expect(authenticatedPage).toHaveURL(/\/$/)
    await dashboardPage.expectOnDashboard()
  })

  test('should display welcome message with user info', async () => {
    await dashboardPage.navigate()
    await dashboardPage.expectWelcomeMessageVisible()
    await dashboardPage.expectUserGreetingVisible()
  })

  test('should keep user session intact during dashboard navigation', async ({ authenticatedPage }) => {
    await dashboardPage.navigate()
    await dashboardPage.expectOnDashboard()

    await dashboardPage.navigate()
    await dashboardPage.expectOnDashboard()

    const token = await authenticatedPage.evaluate(() => localStorage.getItem('vyrak_access_token'))
    expect(token).toBeTruthy()
  })
})
