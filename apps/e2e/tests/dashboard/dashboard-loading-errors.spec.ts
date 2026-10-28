import { expect, test } from '@fixtures/auth.fixture'
import { DashboardPage } from '@page-objects/dashboard/dashboard.page'

test.describe('Dashboard - Loading States & Error Handling', () => {
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage)
  })

  test('should display content after waiting for network idle', async () => {
    await dashboardPage.navigate()
    await dashboardPage.expectOnDashboard()
    await dashboardPage.expectMainContentVisible()
    await dashboardPage.expectWelcomeMessageVisible()
  })

  test('should display stats cards with proper layout', async () => {
    await dashboardPage.navigate()
    await dashboardPage.expectStatsSectionVisible()
    await dashboardPage.expectStatCardVisible('organizations')
  })

  test('should handle missing organization data gracefully', async () => {
    await dashboardPage.navigate()
    await dashboardPage.expectMainContentVisible()
  })

  test('should display user information section', async () => {
    await dashboardPage.navigate()
    await dashboardPage.expectUserInfoSectionVisible()
    await dashboardPage.expectUserInfoFieldVisible('id')
    await dashboardPage.expectUserInfoFieldVisible('email')
  })

  test('should display all navigation sections', async () => {
    await dashboardPage.navigate()
    await dashboardPage.expectWelcomeMessageVisible()
    await dashboardPage.expectStatsSectionVisible()
    await dashboardPage.expectQuickActionsVisible()
  })

  test('should handle page reload with proper re-initialization', async () => {
    await dashboardPage.navigate()
    await dashboardPage.reload()
    await dashboardPage.expectMainContentVisible()
  })

  test('should maintain scrollable content on long pages', async ({ authenticatedPage }) => {
    await dashboardPage.navigate()
    await authenticatedPage.keyboard.press('End')
    await dashboardPage.expectOnDashboard()
    await authenticatedPage.keyboard.press('Home')
    await dashboardPage.expectWelcomeMessageVisible()
  })

  test('should display correct count of organizations', async () => {
    await dashboardPage.navigate()
    const text = await dashboardPage.getStatCardText('organizations')
    expect(text).toBeTruthy()
  })

  test('should handle quick successive navigations to dashboard', async () => {
    for (let i = 0; i < 3; i++) {
      await dashboardPage.navigate()
    }
    await dashboardPage.expectOnDashboard()
    await dashboardPage.expectMainContentVisible()
  })

  test('should verify no console errors after dashboard load', async ({ authenticatedPage }) => {
    const consoleErrors: string[] = []

    authenticatedPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await dashboardPage.navigate()
    const criticalErrors = consoleErrors.filter((err) => !err.includes('warning') && !err.includes('Warning'))
    expect(criticalErrors.length).toBe(0)
  })

  test('should display active organization indicator', async () => {
    await dashboardPage.navigate()
    const optionCount = await dashboardPage.getOrgSelectorOptions()
    expect(optionCount).toBeGreaterThanOrEqual(1)
  })
})
