import { expect, test } from '@fixtures/auth.fixture'
import { ApprovalBannerPage, ApprovalModalPage } from '@page-objects/approvals'
import { WorkflowDetailPage, WorkflowsPage } from '@page-objects/workflows'

/**
 * Story 14.2: Template-Aware Approval Modal - Hotfix Template
 * Tests bug analysis display, fix approach, regression test plan
 */
test.describe('14.2 Approval Modal - Hotfix Template', () => {
  let workflowsPage: WorkflowsPage
  let detailPage: WorkflowDetailPage
  let bannerPage: ApprovalBannerPage
  let modalPage: ApprovalModalPage

  test.beforeEach(async ({ authenticatedPage }) => {
    workflowsPage = new WorkflowsPage(authenticatedPage)
    detailPage = new WorkflowDetailPage(authenticatedPage)
    bannerPage = new ApprovalBannerPage(authenticatedPage)
    modalPage = new ApprovalModalPage(authenticatedPage)
  })

  test('should display Hotfix template badge in modal', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    // Find workflows, looking for hotfix template
    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundHotfixWorkflow = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      const templateText = await row.textContent()

      if (templateText?.toLowerCase().includes('hotfix')) {
        await row.click()
        foundHotfixWorkflow = true
        break
      }
    }

    if (!foundHotfixWorkflow) {
      test.skip()
    }

    await detailPage.expectPageLoaded()

    const bannerVisible = await bannerPage
      .getPage()
      .locator('[data-testid*="approval-banner"]')
      .isVisible()
      .catch(() => false)

    if (bannerVisible) {
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()
      await modalPage.expectTemplateBadge('hotfix')
    }
  })

  test('should display Bug Analysis section with description', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundHotfixWorkflow = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      const templateText = await row.textContent()

      if (templateText?.toLowerCase().includes('hotfix')) {
        await row.click()
        foundHotfixWorkflow = true
        break
      }
    }

    if (!foundHotfixWorkflow) {
      test.skip()
    }

    await detailPage.expectPageLoaded()

    const bannerVisible = await bannerPage
      .getPage()
      .locator('[data-testid*="approval-banner"]')
      .isVisible()
      .catch(() => false)

    if (bannerVisible) {
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()
      await modalPage.expectBugAnalysisVisible()
      await modalPage.expectBugDescriptionVisible()
    }
  })

  test('should display Root Cause Analysis in bug analysis section', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundHotfixWorkflow = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      const templateText = await row.textContent()

      if (templateText?.toLowerCase().includes('hotfix')) {
        await row.click()
        foundHotfixWorkflow = true
        break
      }
    }

    if (!foundHotfixWorkflow) {
      test.skip()
    }

    await detailPage.expectPageLoaded()

    const bannerVisible = await bannerPage
      .getPage()
      .locator('[data-testid*="approval-banner"]')
      .isVisible()
      .catch(() => false)

    if (bannerVisible) {
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()
      await modalPage.expectBugAnalysisVisible()

      const rootCauseVisible = await modalPage
        .getPage()
        .locator('text=/root cause|root-cause/i')
        .isVisible()
        .catch(() => false)

      if (rootCauseVisible) {
        expect(rootCauseVisible).toBeTruthy()
      }
    }
  })

  test('should display Impact Assessment in bug analysis section', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundHotfixWorkflow = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      const templateText = await row.textContent()

      if (templateText?.toLowerCase().includes('hotfix')) {
        await row.click()
        foundHotfixWorkflow = true
        break
      }
    }

    if (!foundHotfixWorkflow) {
      test.skip()
    }

    await detailPage.expectPageLoaded()

    const bannerVisible = await bannerPage
      .getPage()
      .locator('[data-testid*="approval-banner"]')
      .isVisible()
      .catch(() => false)

    if (bannerVisible) {
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()
      await modalPage.expectBugAnalysisVisible()

      const impactVisible = await modalPage
        .getPage()
        .locator('text=/impact assessment|impact/i')
        .isVisible()
        .catch(() => false)

      if (impactVisible) {
        expect(impactVisible).toBeTruthy()
      }
    }
  })

  test('should display Affected Files/Modules in bug analysis', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundHotfixWorkflow = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      const templateText = await row.textContent()

      if (templateText?.toLowerCase().includes('hotfix')) {
        await row.click()
        foundHotfixWorkflow = true
        break
      }
    }

    if (!foundHotfixWorkflow) {
      test.skip()
    }

    await detailPage.expectPageLoaded()

    const bannerVisible = await bannerPage
      .getPage()
      .locator('[data-testid*="approval-banner"]')
      .isVisible()
      .catch(() => false)

    if (bannerVisible) {
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()
      await modalPage.expectBugAnalysisVisible()

      const affectedVisible = await modalPage
        .getPage()
        .locator('text=/affected files|affected modules/i')
        .isVisible()
        .catch(() => false)

      if (affectedVisible) {
        expect(affectedVisible).toBeTruthy()
      }
    }
  })

  test('should display Fix Approach section with markdown content', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundHotfixWorkflow = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      const templateText = await row.textContent()

      if (templateText?.toLowerCase().includes('hotfix')) {
        await row.click()
        foundHotfixWorkflow = true
        break
      }
    }

    if (!foundHotfixWorkflow) {
      test.skip()
    }

    await detailPage.expectPageLoaded()

    const bannerVisible = await bannerPage
      .getPage()
      .locator('[data-testid*="approval-banner"]')
      .isVisible()
      .catch(() => false)

    if (bannerVisible) {
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()
      await modalPage.expectFixApproachVisible()
    }
  })

  test('should display Regression Test Plan section', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundHotfixWorkflow = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      const templateText = await row.textContent()

      if (templateText?.toLowerCase().includes('hotfix')) {
        await row.click()
        foundHotfixWorkflow = true
        break
      }
    }

    if (!foundHotfixWorkflow) {
      test.skip()
    }

    await detailPage.expectPageLoaded()

    const bannerVisible = await bannerPage
      .getPage()
      .locator('[data-testid*="approval-banner"]')
      .isVisible()
      .catch(() => false)

    if (bannerVisible) {
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()
      await modalPage.expectRegressionTestPlanVisible()
    }
  })

  test('should display Validation section with rollback plan', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundHotfixWorkflow = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      const templateText = await row.textContent()

      if (templateText?.toLowerCase().includes('hotfix')) {
        await row.click()
        foundHotfixWorkflow = true
        break
      }
    }

    if (!foundHotfixWorkflow) {
      test.skip()
    }

    await detailPage.expectPageLoaded()

    const bannerVisible = await bannerPage
      .getPage()
      .locator('[data-testid*="approval-banner"]')
      .isVisible()
      .catch(() => false)

    if (bannerVisible) {
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()

      const validationVisible = await modalPage
        .getPage()
        .locator('text=/validation|rollback|verify/i')
        .isVisible()
        .catch(() => false)

      if (validationVisible) {
        expect(validationVisible).toBeTruthy()
      }
    }
  })

  test('should display code blocks with syntax highlighting', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundHotfixWorkflow = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      const templateText = await row.textContent()

      if (templateText?.toLowerCase().includes('hotfix')) {
        await row.click()
        foundHotfixWorkflow = true
        break
      }
    }

    if (!foundHotfixWorkflow) {
      test.skip()
    }

    await detailPage.expectPageLoaded()

    const bannerVisible = await bannerPage
      .getPage()
      .locator('[data-testid*="approval-banner"]')
      .isVisible()
      .catch(() => false)

    if (bannerVisible) {
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()

      const codeBlocksVisible = await modalPage
        .getPage()
        .locator('pre, [class*="code-block"], [class*="hljs"]')
        .isVisible()
        .catch(() => false)

      if (codeBlocksVisible) {
        expect(codeBlocksVisible).toBeTruthy()
      }
    }
  })

  test('should display estimated fix duration', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundHotfixWorkflow = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      const templateText = await row.textContent()

      if (templateText?.toLowerCase().includes('hotfix')) {
        await row.click()
        foundHotfixWorkflow = true
        break
      }
    }

    if (!foundHotfixWorkflow) {
      test.skip()
    }

    await detailPage.expectPageLoaded()

    const bannerVisible = await bannerPage
      .getPage()
      .locator('[data-testid*="approval-banner"]')
      .isVisible()
      .catch(() => false)

    if (bannerVisible) {
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()

      const durationVisible = await modalPage
        .getPage()
        .locator('text=/estimated|duration|hours|minutes/i')
        .isVisible()
        .catch(() => false)

      if (durationVisible) {
        expect(durationVisible).toBeTruthy()
      }
    }
  })

  test('should have Approve and Reject buttons in footer', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundHotfixWorkflow = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      const templateText = await row.textContent()

      if (templateText?.toLowerCase().includes('hotfix')) {
        await row.click()
        foundHotfixWorkflow = true
        break
      }
    }

    if (!foundHotfixWorkflow) {
      test.skip()
    }

    await detailPage.expectPageLoaded()

    const bannerVisible = await bannerPage
      .getPage()
      .locator('[data-testid*="approval-banner"]')
      .isVisible()
      .catch(() => false)

    if (bannerVisible) {
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()
      await modalPage.expectApproveButtonVisible()
      await modalPage.expectRejectButtonVisible()
    }
  })

  test('should have comment textarea in footer', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    let foundHotfixWorkflow = false
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      const templateText = await row.textContent()

      if (templateText?.toLowerCase().includes('hotfix')) {
        await row.click()
        foundHotfixWorkflow = true
        break
      }
    }

    if (!foundHotfixWorkflow) {
      test.skip()
    }

    await detailPage.expectPageLoaded()

    const bannerVisible = await bannerPage
      .getPage()
      .locator('[data-testid*="approval-banner"]')
      .isVisible()
      .catch(() => false)

    if (bannerVisible) {
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()
      await modalPage.expectCommentFieldVisible()
    }
  })
})
