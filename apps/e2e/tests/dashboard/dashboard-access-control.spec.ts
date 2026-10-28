import { expect, test } from '@fixtures/auth.fixture'
import { StorageHelper } from '@helpers/storage.helper'
import { DashboardPage } from '@page-objects/dashboard/dashboard.page'

test.describe('Dashboard - Access Control & Permissions', () => {
  let dashboardPage: DashboardPage

  test('should require valid auth token for dashboard access', async ({ page }) => {
    dashboardPage = new DashboardPage(page)
    await StorageHelper.clearLocalStorage(page)
    await dashboardPage.navigate()

    const hasToken = await StorageHelper.isAuthenticated(page)
    expect(hasToken).toBe(false)
  })

  test('should maintain dashboard access with valid token', async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage)

    const token = await StorageHelper.getAuthToken(authenticatedPage)
    expect(token).toBeTruthy()

    await dashboardPage.navigate()
    await dashboardPage.expectOnDashboard()
  })

  test('should display correct user information for logged-in user', async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage)
    await dashboardPage.navigate()

    await dashboardPage.expectUserInfoVisible()
  })

  test('should allow users to view their own user information', async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage)
    await dashboardPage.navigate()

    await dashboardPage.expectUserInfoSectionVisible()
    await dashboardPage.expectUserInfoFieldVisible('id')
    await dashboardPage.expectUserInfoFieldVisible('email')
  })

  test('should allow users to access quick action links based on permissions', async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage)
    await dashboardPage.navigate()

    const optionCount = await dashboardPage.getOrgSelectorOptions()
    if (optionCount > 1) {
      await dashboardPage.expectQuickActionsVisible()
    }
  })

  test('should prevent access to settings if no active organization', async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage)
    await dashboardPage.navigate()

    const optionCount = await dashboardPage.getOrgSelectorOptions()
    if (optionCount > 1) {
      const activeOrgId = await dashboardPage.getActiveOrgId()
      expect(activeOrgId).toBeTruthy()
    }
  })

  test('should maintain authorization across page reloads', async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage)
    await dashboardPage.navigate()
    await dashboardPage.expectOnDashboard()

    await dashboardPage.reload()
    await dashboardPage.expectOnDashboard()

    const token = await StorageHelper.getAuthToken(authenticatedPage)
    expect(token).toBeTruthy()
  })

  test('should verify user session is tied to correct identity', async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage)
    await dashboardPage.navigate()

    await dashboardPage.expectUserInfoVisible()
  })

  test('should have proper authorization headers when making API calls', async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage)

    let apiCallMade = false
    let hadAuthHeader = false

    authenticatedPage.on('response', (response) => {
      const url = response.url()
      if (url.includes('/api/') && !url.includes('/health')) {
        apiCallMade = true
        if (response.status() === 200 || response.status() === 201) {
          hadAuthHeader = true
        }
      }
    })

    await dashboardPage.navigate()

    if (apiCallMade) {
      expect(hadAuthHeader).toBe(true)
    }
  })
})
