import { test } from '@fixtures/auth.fixture'
import { DashboardPage } from '@page-objects/dashboard/dashboard.page'

test.describe('Dashboard - Responsive Design', () => {
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage)
    await dashboardPage.navigate()
  })

  test('should display correctly on mobile viewport (375px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 667 })

    await dashboardPage.expectOnDashboard()
    await dashboardPage.expectMainContentVisible()
    await dashboardPage.expectWelcomeMessageVisible()
    await dashboardPage.expectLogoutButtonVisible()
  })

  test('should display correctly on tablet viewport (768px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 768, height: 1024 })

    await dashboardPage.expectOnDashboard()
    await dashboardPage.expectMainContentVisible()
    await dashboardPage.expectStatsSectionVisible()
  })

  test('should display correctly on desktop viewport (1366px)', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 1366, height: 768 })

    await dashboardPage.expectOnDashboard()
    await dashboardPage.expectMainContentVisible()
    await dashboardPage.expectWelcomeMessageVisible()
    await dashboardPage.expectLogoutButtonVisible()
  })

  test('should maintain usability when resized from mobile to desktop', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 667 })
    await dashboardPage.expectOnDashboard()

    await authenticatedPage.setViewportSize({ width: 1366, height: 768 })
    await dashboardPage.expectMainContentVisible()
    await dashboardPage.expectWelcomeMessageVisible()
  })

  test('should stack logout button properly on mobile', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 667 })

    await dashboardPage.expectOnDashboard()
    await dashboardPage.expectLogoutButtonVisible()
  })

  test('should handle text overflow on small screens', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 320, height: 568 })

    await dashboardPage.expectOnDashboard()
    await dashboardPage.expectWelcomeMessageVisible()
  })

  test('should display organization selector properly on all screen sizes', async ({ authenticatedPage }) => {
    const sizes = [
      { width: 375, height: 667 },
      { width: 768, height: 1024 },
      { width: 1366, height: 768 },
    ]

    for (const size of sizes) {
      await authenticatedPage.setViewportSize(size)
      await dashboardPage.navigate()
      await dashboardPage.expectOnDashboard()
    }
  })
})
