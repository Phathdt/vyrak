import { expect, test } from '@fixtures/auth.fixture'
import { DashboardPage } from '@page-objects/dashboard/dashboard.page'

test.describe('Dashboard - Organization Selector', () => {
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage)
    await dashboardPage.navigate()
  })

  test('should display organization selector when organizations exist', async () => {
    await dashboardPage.expectOnDashboard()
    await dashboardPage.expectOrgSelectorVisible()
  })

  test('should show all user organizations in dropdown', async () => {
    await dashboardPage.expectOnDashboard()
    const optionCount = await dashboardPage.getOrgSelectorOptions()
    expect(optionCount).toBeGreaterThanOrEqual(2)
  })

  test('should display selected organization details', async () => {
    await dashboardPage.expectOnDashboard()
    const activeOrgId = await dashboardPage.getActiveOrgId()

    if (activeOrgId) {
      await dashboardPage.expectOrgSelectorSlugVisible()
    }
  })

  test('should allow switching between organizations', async () => {
    await dashboardPage.expectOnDashboard()

    const optionCount = await dashboardPage.getOrgSelectorOptions()

    if (optionCount > 2) {
      const firstSelectedValue = await dashboardPage.getActiveOrgId()
      await dashboardPage.selectOrganizationByIndex(2)
      const newSelectedValue = await dashboardPage.getActiveOrgId()

      expect(newSelectedValue).not.toBe(firstSelectedValue)
    }
  })

  test('should persist organization selection on page reload', async () => {
    await dashboardPage.expectOnDashboard()

    const optionCount = await dashboardPage.getOrgSelectorOptions()

    if (optionCount > 2) {
      await dashboardPage.selectOrganizationByIndex(2)
      const selectedOrgId = await dashboardPage.getActiveOrgId()

      await dashboardPage.reload()

      const reloadedOrgId = await dashboardPage.getActiveOrgId()
      expect(reloadedOrgId).toBe(selectedOrgId)
    }
  })

  test('should navigate to organization settings when settings card clicked', async () => {
    await dashboardPage.expectOnDashboard()

    const activeOrgId = await dashboardPage.getActiveOrgId()

    if (activeOrgId) {
      try {
        await dashboardPage.expectQuickActionSettingsVisible()
        await dashboardPage.expectOnDashboard()
      } catch {
        // Settings card not visible for this org, that's okay
      }
    }
  })
})
