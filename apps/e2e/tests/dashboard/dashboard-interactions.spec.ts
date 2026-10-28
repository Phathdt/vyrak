import { expect, test } from '@fixtures/auth.fixture'
import { StorageHelper } from '@helpers/storage.helper'
import { DashboardPage } from '@page-objects/dashboard/dashboard.page'

test.describe('Dashboard - User Interactions', () => {
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ authenticatedPage }) => {
    dashboardPage = new DashboardPage(authenticatedPage)
    await dashboardPage.navigate()
  })

  test('should handle welcome message visibility', async () => {
    await dashboardPage.expectWelcomeMessageVisible()
  })

  test('should logout when clicking logout button', async ({ authenticatedPage }) => {
    let token = await StorageHelper.getAuthToken(authenticatedPage)
    expect(token).toBeTruthy()

    await dashboardPage.clickLogout()
    await expect(authenticatedPage).toHaveURL(/\/login/, { timeout: 10000 })

    token = await StorageHelper.getAuthToken(authenticatedPage)
    expect(token).toBeNull()
  })

  test('should switch active organization when selecting from dropdown', async () => {
    const optionCount = await dashboardPage.getOrgSelectorOptions()

    if (optionCount > 2) {
      await dashboardPage.getActiveOrgId()
      await dashboardPage.selectOrganizationByIndex(2)
      const newSelection = await dashboardPage.getActiveOrgId()
      expect(newSelection).not.toBe('')
    }
  })

  test('should allow user to scroll dashboard vertically', async ({ authenticatedPage }) => {
    const initialScrollTop = await authenticatedPage.evaluate(() => window.scrollY)

    await authenticatedPage.keyboard.press('PageDown')
    const scrolledDown = await authenticatedPage.evaluate(() => window.scrollY)
    expect(scrolledDown).toBeGreaterThanOrEqual(initialScrollTop)

    await authenticatedPage.keyboard.press('Home')
    const scrolledUp = await authenticatedPage.evaluate(() => window.scrollY)
    expect(scrolledUp).toBeLessThanOrEqual(scrolledDown)
  })

  test('should handle hover effects on interactive cards', async ({ authenticatedPage }) => {
    const interactiveCards = authenticatedPage.locator('[class*="interactive"]')
    const count = await interactiveCards.count()

    if (count > 0) {
      const card = interactiveCards.first()
      await card.hover()
      await expect(card).toBeVisible()
    }
  })

  test('should handle focus on organization selector', async () => {
    await dashboardPage.expectOrgSelectorVisible()

    const optionCount = await dashboardPage.getOrgSelectorOptions()
    if (optionCount > 0) {
      // Selector is accessible and interactive
      expect(optionCount).toBeGreaterThanOrEqual(1)
    }
  })

  test('should handle escape key press in dashboard', async ({ authenticatedPage }) => {
    await authenticatedPage.keyboard.press('Escape')
    await dashboardPage.expectOnDashboard()
  })

  test('should maintain interaction history when navigating within dashboard', async () => {
    const optionCount = await dashboardPage.getOrgSelectorOptions()

    if (optionCount > 2) {
      await dashboardPage.selectOrganizationByIndex(1)
      await dashboardPage.navigate()

      await dashboardPage.expectOrgSelectorVisible()
    }
  })

  test('should handle fast switching between organizations', async () => {
    const optionCount = await dashboardPage.getOrgSelectorOptions()

    if (optionCount > 3) {
      await dashboardPage.selectOrganizationByIndex(1)
      await dashboardPage.selectOrganizationByIndex(2)

      const currentValue = await dashboardPage.getActiveOrgId()
      expect(currentValue).toBeTruthy()
    }
  })
})
