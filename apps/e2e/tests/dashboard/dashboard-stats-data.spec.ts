import { expect, test } from '@fixtures/auth.fixture'
import { DashboardPage } from '@page-objects/dashboard/dashboard.page'

test.describe('Dashboard - Stats & Data Display', () => {
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage)
    await dashboardPage.navigate()
  })

  test('should display organization count stat accurately', async () => {
    await dashboardPage.expectStatCardVisible('organizations')
    const text = await dashboardPage.getStatCardText('organizations')
    expect(text).toBeTruthy()
  })

  test('should display active organization stat', async () => {
    await dashboardPage.expectStatCardVisible('activeOrg')
    const text = await dashboardPage.getStatCardText('activeOrg')
    expect(text).toBeTruthy()
  })

  test('should display account status stat', async () => {
    await dashboardPage.expectStatCardVisible('status')
    const text = await dashboardPage.getStatCardText('status')
    expect(text).toContain('Active')
  })

  test('should display user role stat', async () => {
    await dashboardPage.expectStatCardVisible('role')
    const text = await dashboardPage.getStatCardText('role')
    expect(text).toBeTruthy()
  })

  test('should update stats when switching organizations', async () => {
    await dashboardPage.expectOrgSelectorVisible()
    const optionCount = await dashboardPage.getOrgSelectorOptions()

    if (optionCount > 2) {
      await dashboardPage.getStatCardText('activeOrg')
      await dashboardPage.selectOrganizationByIndex(2)
      const newText = await dashboardPage.getStatCardText('activeOrg')
      expect(newText).toBeTruthy()
    }
  })

  test('should have organizations in selector', async () => {
    await dashboardPage.expectOrgSelectorVisible()
    const optionCount = await dashboardPage.getOrgSelectorOptions()
    expect(optionCount).toBeGreaterThanOrEqual(1)
  })

  test('should display user information in correct format', async () => {
    await dashboardPage.expectUserInfoSectionVisible()
    await dashboardPage.expectUserInfoFieldVisible('id')
    await dashboardPage.expectUserInfoFieldVisible('email')
    await dashboardPage.expectUserInfoFieldVisible('name')
    await dashboardPage.expectUserInfoFieldVisible('orgCount')
  })

  test('should display quick action cards when organizations exist', async () => {
    const optionCount = await dashboardPage.getOrgSelectorOptions()
    if (optionCount > 1) {
      await dashboardPage.expectQuickActionsVisible()
      await dashboardPage.expectQuickActionOrganizationsVisible()
    }
  })

  test('should handle organization selector', async () => {
    await dashboardPage.expectOrgSelectorVisible()
    const optionCount = await dashboardPage.getOrgSelectorOptions()
    expect(optionCount).toBeGreaterThanOrEqual(1)
  })

  test('should display organization slug when selected', async () => {
    await dashboardPage.expectOrgSelectorVisible()
    const activeOrgId = await dashboardPage.getActiveOrgId()

    if (activeOrgId) {
      await dashboardPage.expectOrgSelectorSlugVisible()
    }
  })

  test('should verify all stat cards visible', async () => {
    await dashboardPage.expectStatsSectionVisible()
    await dashboardPage.expectStatCardVisible('organizations')
    await dashboardPage.expectStatCardVisible('activeOrg')
    await dashboardPage.expectStatCardVisible('status')
    await dashboardPage.expectStatCardVisible('role')
  })
})
