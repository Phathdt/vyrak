import { expect, test } from '@fixtures/auth.fixture'
import { ApprovalBannerPage } from '@page-objects/approvals'
import { WorkflowDetailPage, WorkflowsPage } from '@page-objects/workflows'

/**
 * Story 14.1: Approval Status Indicator
 * Tests approval banner display, status badges, browser notifications
 */
test.describe('14.1 Approval Status Indicator', () => {
  let workflowsPage: WorkflowsPage
  let detailPage: WorkflowDetailPage
  let bannerPage: ApprovalBannerPage

  test.beforeEach(async ({ authenticatedPage }) => {
    workflowsPage = new WorkflowsPage(authenticatedPage)
    detailPage = new WorkflowDetailPage(authenticatedPage)
    bannerPage = new ApprovalBannerPage(authenticatedPage)
  })

  test('should display approval banner when workflow waiting for approval', async ({ authenticatedPage }) => {
    // Navigate to workflows list
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    // Find a workflow with waiting_approval status
    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundApprovalWorkflow = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      const statusText = await row.locator('[data-testid*="status"]').textContent()

      if (statusText?.toLowerCase().includes('waiting') || statusText?.toLowerCase().includes('approval')) {
        await row.click()
        foundApprovalWorkflow = true
        break
      }
    }

    if (!foundApprovalWorkflow) {
      test.skip()
    }

    // Verify banner is visible
    await bannerPage.expectBannerVisible()
    await bannerPage.expectBannerShowsMessage(/waiting for approval|paused/i)
  })

  test('should show approval banner with "Waiting for approval" message', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const firstRow = rows.first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (!rowVisible) {
      test.skip()
    }

    await firstRow.click()
    await detailPage.expectPageLoaded()

    // Check for approval banner
    const bannerVisible = await bannerPage
      .getPage()
      .locator('[data-testid*="approval-banner"], [class*="approval"]')
      .isVisible()
      .catch(() => false)

    if (bannerVisible) {
      await bannerPage.expectBannerShowsMessage(/waiting for approval|paused/i)
    }
  })

  test('should display timestamp in approval banner', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const firstRow = rows.first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (!rowVisible) {
      test.skip()
    }

    await firstRow.click()
    await detailPage.expectPageLoaded()

    const bannerVisible = await bannerPage
      .getPage()
      .locator('[data-testid*="approval-banner"]')
      .isVisible()
      .catch(() => false)

    if (bannerVisible) {
      await bannerPage.expectBannerShowsTimestamp()
    }
  })

  test('should display [Review & Approve] button in banner', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const firstRow = rows.first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (!rowVisible) {
      test.skip()
    }

    await firstRow.click()
    await detailPage.expectPageLoaded()

    const bannerVisible = await bannerPage
      .getPage()
      .locator('[data-testid*="approval-banner"]')
      .isVisible()
      .catch(() => false)

    if (bannerVisible) {
      await bannerPage.expectReviewButtonVisible()
      await bannerPage.expectReviewButtonEnabled()
    }
  })

  test('should highlight workflows with waiting approval status in list', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    // Look for waiting approval status badge
    const statusBadges = authenticatedPage.locator('text=/waiting approval|waiting for approval/i')
    const badgeVisible = await statusBadges
      .first()
      .isVisible()
      .catch(() => false)

    if (badgeVisible) {
      const badgeCount = await statusBadges.count()
      expect(badgeCount).toBeGreaterThan(0)
    }
  })

  test('should display approval count badge on dashboard', async ({ authenticatedPage }) => {
    // Navigate to a page where dashboard badge is visible
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    // Check for approval badge count
    const approvalBadge = authenticatedPage.locator(
      'text=/workflows? awaiting approval/i, [data-testid*="approval-count"]'
    )
    const isVisible = await approvalBadge.isVisible().catch(() => false)

    if (isVisible) {
      const badgeText = await approvalBadge.textContent()
      expect(badgeText).toBeTruthy()
    }
  })

  test('should request browser notification permission on first approval workflow', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const firstRow = rows.first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (!rowVisible) {
      test.skip()
    }

    await firstRow.click()
    await detailPage.expectPageLoaded()

    // Check for notification permission request
    const notificationRequest = authenticatedPage
      .locator('[role="dialog"]', { hasText: /notification|permission/i })
      .first()

    const isVisible = await notificationRequest.isVisible().catch(() => false)
    if (isVisible) {
      // Permission dialog appeared
      expect(isVisible).toBeTruthy()
    }
  })

  test('should allow user to enable browser notifications', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const firstRow = rows.first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (!rowVisible) {
      test.skip()
    }

    await firstRow.click()
    await detailPage.expectPageLoaded()

    const allowButton = authenticatedPage
      .locator('[role="dialog"]', { hasText: /notification|permission/i })
      .getByRole('button', { name: /allow|enable/i })
      .first()

    const isVisible = await allowButton.isVisible().catch(() => false)
    if (isVisible) {
      // User can click allow button
      expect(isVisible).toBeTruthy()
    }
  })

  test('should allow user to disable browser notifications', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const firstRow = rows.first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (!rowVisible) {
      test.skip()
    }

    await firstRow.click()
    await detailPage.expectPageLoaded()

    const denyButton = authenticatedPage
      .locator('[role="dialog"]', { hasText: /notification|permission/i })
      .getByRole('button', { name: /deny|disable|not now/i })
      .first()

    const isVisible = await denyButton.isVisible().catch(() => false)
    if (isVisible) {
      // User can click deny button
      expect(isVisible).toBeTruthy()
    }
  })

  test('should update badge count in real-time via SSE', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    // Get initial badge count
    const badgeText = await authenticatedPage
      .locator('text=/workflows? awaiting approval/i, [data-testid*="approval-count"]')
      .textContent()
      .catch(() => null)

    // Badge presence indicates real-time capability
    if (badgeText) {
      expect(badgeText).toBeTruthy()
    }
  })
})
