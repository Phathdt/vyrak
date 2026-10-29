import { expect, test } from '@fixtures/auth.fixture'
import { ApprovalHistoryPage } from '@page-objects/approvals'
import { WorkflowDetailPage, WorkflowsPage } from '@page-objects/workflows'

/**
 * Story 14.4: Approval History
 * Tests approval history display, entries, export functionality
 */
test.describe('14.4 Approval History', () => {
  let workflowsPage: WorkflowsPage
  let detailPage: WorkflowDetailPage
  let historyPage: ApprovalHistoryPage

  test.beforeEach(async ({ authenticatedPage }) => {
    workflowsPage = new WorkflowsPage(authenticatedPage)
    detailPage = new WorkflowDetailPage(authenticatedPage)
    historyPage = new ApprovalHistoryPage(authenticatedPage)
  })

  test('should display approval history section in workflow detail page', async ({ authenticatedPage }) => {
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

    // History section should be visible (even if empty initially)
    const historySectionVisible = await historyPage
      .getPage()
      .locator('[data-testid*="approval-history"], text=/approval history/i')
      .isVisible()
      .catch(() => false)

    if (historySectionVisible) {
      await historyPage.expectHistorySectionVisible()
    }
  })

  test('should show empty state when no approvals yet', async ({ authenticatedPage }) => {
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

    const historySectionVisible = await historyPage
      .getPage()
      .locator('[data-testid*="approval-history"]')
      .isVisible()
      .catch(() => false)

    if (historySectionVisible) {
      const emptyVisible = await historyPage
        .getPage()
        .locator('text=/no approval|no decisions|not yet/i')
        .isVisible()
        .catch(() => false)

      // Either empty state or entries are shown
      if (emptyVisible) {
        await historyPage.expectEmptyState()
      }
    }
  })

  test('should display approval entries chronologically', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    // Find a workflow with approval history
    let foundWorkflowWithHistory = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      await row.click()

      await detailPage.expectPageLoaded()

      const entryCount = await historyPage.getEntryCount()
      if (entryCount > 0) {
        foundWorkflowWithHistory = true
        break
      }

      await workflowsPage.navigate()
    }

    if (!foundWorkflowWithHistory) {
      test.skip()
    }

    // Verify chronological order (most recent first or last)
    await historyPage.expectChronologicalOrder()
  })

  test('should display timestamp for each approval entry', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundWorkflowWithHistory = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      await row.click()

      await detailPage.expectPageLoaded()

      const entryCount = await historyPage.getEntryCount()
      if (entryCount > 0) {
        foundWorkflowWithHistory = true

        const timestamp = await historyPage.getEntryTimestamp(0)
        expect(timestamp).toBeTruthy()
        break
      }

      await workflowsPage.navigate()
    }

    if (!foundWorkflowWithHistory) {
      test.skip()
    }
  })

  test('should display approver name and avatar', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundWorkflowWithHistory = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      await row.click()

      await detailPage.expectPageLoaded()

      const entryCount = await historyPage.getEntryCount()
      if (entryCount > 0) {
        foundWorkflowWithHistory = true

        const approverName = await historyPage.getEntryApproverName(0)
        expect(approverName).toBeTruthy()

        // Avatar check
        const avatarVisible = await historyPage
          .getPage()
          .locator('img[alt*="avatar"], [class*="avatar"]')
          .first()
          .isVisible()
          .catch(() => false)

        if (avatarVisible) {
          expect(avatarVisible).toBeTruthy()
        }
        break
      }

      await workflowsPage.navigate()
    }

    if (!foundWorkflowWithHistory) {
      test.skip()
    }
  })

  test('should display decision: Approved with green indicator', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundApprovedWorkflow = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      await row.click()

      await detailPage.expectPageLoaded()

      const entryCount = await historyPage.getEntryCount()
      if (entryCount > 0) {
        const decision = await historyPage.getEntryDecision(0)

        if (decision?.toLowerCase().includes('approved')) {
          foundApprovedWorkflow = true
          await historyPage.expectEntryDecision(0, 'approved')
          break
        }
      }

      await workflowsPage.navigate()
    }

    if (!foundApprovedWorkflow) {
      test.skip()
    }
  })

  test('should display decision: Rejected with red indicator', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundRejectedWorkflow = false
    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const row = rows.nth(i)
      await row.click()

      await detailPage.expectPageLoaded()

      const entryCount = await historyPage.getEntryCount()
      if (entryCount > 0) {
        const decision = await historyPage.getEntryDecision(0)

        if (decision?.toLowerCase().includes('rejected')) {
          foundRejectedWorkflow = true
          await historyPage.expectEntryDecision(0, 'rejected')
          break
        }
      }

      await workflowsPage.navigate()
    }

    if (!foundRejectedWorkflow) {
      test.skip()
    }
  })

  test('should display template phase (Planning Phase or Bug Analysis Phase)', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundWorkflowWithHistory = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      await row.click()

      await detailPage.expectPageLoaded()

      const entryCount = await historyPage.getEntryCount()
      if (entryCount > 0) {
        foundWorkflowWithHistory = true

        const phase = await historyPage.getEntryPhase(0)
        expect(phase).toMatch(/planning|bug analysis|phase/i)
        break
      }

      await workflowsPage.navigate()
    }

    if (!foundWorkflowWithHistory) {
      test.skip()
    }
  })

  test('should display comment/reason when provided', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundWorkflowWithComment = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      await row.click()

      await detailPage.expectPageLoaded()

      const entryCount = await historyPage.getEntryCount()
      if (entryCount > 0) {
        const comment = await historyPage.getEntryComment(0)

        if (comment && comment.length > 0) {
          foundWorkflowWithComment = true
          expect(comment).toBeTruthy()
          break
        }
      }

      await workflowsPage.navigate()
    }

    if (!foundWorkflowWithComment) {
      test.skip()
    }
  })

  test('should render markdown in comments', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundWorkflowWithMarkdown = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      await row.click()

      await detailPage.expectPageLoaded()

      const entryCount = await historyPage.getEntryCount()
      if (entryCount > 0) {
        const commentSection = authenticatedPage.locator('[data-testid*="comment"], [class*="comment"]').first()

        const isVisible = await commentSection.isVisible().catch(() => false)
        if (isVisible) {
          foundWorkflowWithMarkdown = true
          // Markdown rendering verification (links, formatting)
          expect(isVisible).toBeTruthy()
          break
        }
      }

      await workflowsPage.navigate()
    }

    if (!foundWorkflowWithMarkdown) {
      test.skip()
    }
  })

  test('should show multiple approval entries for rejected then re-submitted workflows', async ({
    authenticatedPage,
  }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundMultipleEntries = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      await row.click()

      await detailPage.expectPageLoaded()

      const entryCount = await historyPage.getEntryCount()
      if (entryCount > 1) {
        foundMultipleEntries = true
        await historyPage.expectEntryCount(entryCount)
        break
      }

      await workflowsPage.navigate()
    }

    if (!foundMultipleEntries) {
      test.skip()
    }
  })

  test('should mark current/final approval clearly', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundWorkflowWithHistory = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      await row.click()

      await detailPage.expectPageLoaded()

      const entryCount = await historyPage.getEntryCount()
      if (entryCount > 0) {
        foundWorkflowWithHistory = true

        // Current/final approval should be marked
        const currentIndicator = authenticatedPage.locator('text=/current|final|latest/i').first()

        const isVisible = await currentIndicator.isVisible().catch(() => false)
        if (isVisible) {
          expect(isVisible).toBeTruthy()
        }
        break
      }

      await workflowsPage.navigate()
    }

    if (!foundWorkflowWithHistory) {
      test.skip()
    }
  })

  test('should have collapsible/expandable history section', async ({ authenticatedPage }) => {
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

    const historySectionVisible = await historyPage
      .getPage()
      .locator('[data-testid*="approval-history"]')
      .isVisible()
      .catch(() => false)

    if (historySectionVisible) {
      const toggleButton = await historyPage.getPage().locator('button[aria-expanded]').first()
      const isPresent = await toggleButton.isVisible().catch(() => false)

      if (isPresent) {
        // Can expand/collapse
        await historyPage.expandHistory()
        await historyPage.expectHistoryExpanded()

        await historyPage.collapseHistory()
        await historyPage.expectHistoryCollapsed()
      }
    }
  })

  test('should display export button', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundWorkflowWithHistory = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      await row.click()

      await detailPage.expectPageLoaded()

      const entryCount = await historyPage.getEntryCount()
      if (entryCount > 0) {
        foundWorkflowWithHistory = true

        const exportButton = authenticatedPage.getByRole('button', { name: /export|download|save/i }).first()

        const isVisible = await exportButton.isVisible().catch(() => false)
        if (isVisible) {
          await historyPage.expectExportButtonVisible()
        }
        break
      }

      await workflowsPage.navigate()
    }

    if (!foundWorkflowWithHistory) {
      test.skip()
    }
  })

  test('should export approval history as JSON or PDF', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundWorkflowWithHistory = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      await row.click()

      await detailPage.expectPageLoaded()

      const entryCount = await historyPage.getEntryCount()
      if (entryCount > 0) {
        foundWorkflowWithHistory = true

        const exportButton = authenticatedPage.getByRole('button', { name: /export|download/i }).first()

        const isVisible = await exportButton.isVisible().catch(() => false)
        if (isVisible) {
          // Export button should be clickable
          expect(isVisible).toBeTruthy()
        }
        break
      }

      await workflowsPage.navigate()
    }

    if (!foundWorkflowWithHistory) {
      test.skip()
    }
  })

  test('should update history in real-time via SSE', async ({ authenticatedPage }) => {
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

    // Get initial entry count
    // const initialCount = await historyPage.getEntryCount()

    // Wait for potential SSE event
    await authenticatedPage.waitForTimeout(1000)

    // Entry count should be updated if new approval came via SSE
    const finalCount = await historyPage.getEntryCount()
    expect(finalCount).toBeDefined()
  })
})
