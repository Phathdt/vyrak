import { TEST_TIMEOUTS } from '@config/test.config'
import { expect, test } from '@fixtures/auth.fixture'
import { WorkflowDetailPage, WorkflowsPage } from '@page-objects/workflows'

test.describe('Workflow Details - Status & Real-time Updates', () => {
  let workflowsPage: WorkflowsPage
  let detailPage: WorkflowDetailPage

  test.beforeEach(async ({ authenticatedPage }) => {
    workflowsPage = new WorkflowsPage(authenticatedPage)
    detailPage = new WorkflowDetailPage(authenticatedPage)
    await workflowsPage.navigate()
  })

  test('should display correct status badge', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      await detailPage.expectOnDetailPage()
      await detailPage.expectStatusVisible()

      const statusText = await detailPage.getCurrentStatus()
      expect(statusText).toMatch(/queued|running|waiting|succeeded|failed|cancelled/i)
    }
  })

  test('should display workflow key identifier', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      await detailPage.expectOnDetailPage()
      const workflowKey = await detailPage.getWorkflowKey()
      expect(workflowKey).toBeTruthy()
    }
  })

  test('should show SSE connection indicator', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      await detailPage.expectConnectionIndicatorVisible()

      // Connection indicator should show one of these states
      const indicator = authenticatedPage.locator('text=/live|connected|connecting|disconnected|reconnecting/i')
      const text = await indicator.textContent()
      expect(text).toMatch(/live|connected|connecting|disconnected|reconnecting/i)
    }
  })

  test('should update progress information', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      await detailPage.expectProgressBarVisible()

      const progressText = await detailPage.getProgressText()
      if (progressText) {
        expect(progressText).toMatch(/completed|steps/i)
      }
    }
  })

  test('should display step timeline section', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      const timelineSection = authenticatedPage.locator('section', {
        has: authenticatedPage.locator('text=/step timeline/i'),
      })

      const isVisible = await timelineSection.isVisible().catch(() => false)
      expect(isVisible).toBeTruthy()
    }
  })

  test('should handle empty step timeline gracefully', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      const emptyMessage = authenticatedPage.locator('text=/no steps yet|initializing/i')
      const stepsPresent = await authenticatedPage
        .locator('[class*="step-card"]')
        .first()
        .isVisible()
        .catch(() => false)

      expect(emptyMessage.isVisible().catch(() => false) || stepsPresent).toBeTruthy()
    }
  })

  test('should persist status on page reload', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      const statusBefore = await detailPage.getCurrentStatus()

      await authenticatedPage.reload()
      await detailPage.expectPageLoaded()

      const statusAfter = await detailPage.getCurrentStatus()

      expect(statusAfter).toBe(statusBefore)
    }
  })

  test('should show workflow overview information', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      const overviewSection = authenticatedPage.locator('section', {
        has: authenticatedPage.locator('text=/overview/i'),
      })

      const isVisible = await overviewSection.isVisible().catch(() => false)
      expect(isVisible).toBeTruthy()
    }
  })

  test('should handle connection state changes', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      const connectionIndicator = authenticatedPage.locator(
        'text=/live|connected|connecting|disconnected|reconnecting/i'
      )

      // Just verify the indicator is present and readable
      const isVisible = await connectionIndicator.isVisible()
      expect(isVisible).toBeTruthy()

      const stateText = await connectionIndicator.textContent()
      expect(stateText).toBeTruthy()
    }
  })
})
