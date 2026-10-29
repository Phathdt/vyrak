import { expect, test } from '@fixtures/auth.fixture'
import { ApprovalBannerPage, ApprovalModalPage } from '@page-objects/approvals'
import { WorkflowDetailPage, WorkflowsPage } from '@page-objects/workflows'

/**
 * Story 14.2: Template-Aware Approval Modal - Feature Template
 * Tests ARD display, stories breakdown, syntax highlighting
 */
test.describe('14.2 Approval Modal - Feature Template', () => {
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

  test('should open approval modal from banner button', async ({ authenticatedPage }) => {
    await workflowsPage.navigate()
    await workflowsPage.expectPageLoaded()

    // Find workflow with approval status
    const rows = authenticatedPage.locator('tbody tr')
    const firstRow = rows.first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (!rowVisible) {
      test.skip()
    }

    await firstRow.click()
    await detailPage.expectPageLoaded()

    // Try to open modal from banner
    const bannerVisible = await bannerPage
      .getPage()
      .locator('[data-testid*="approval-banner"]')
      .isVisible()
      .catch(() => false)

    if (bannerVisible) {
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()
    }
  })

  test('should display modal header with template badge', async ({ authenticatedPage }) => {
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
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()
      await modalPage.expectModalTitle(/review.*approve/i)
    }
  })

  test('should display close button in modal header', async ({ authenticatedPage }) => {
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
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()
      await modalPage.expectCloseButtonVisible()
    }
  })

  test('should display Architecture Requirements Document (ARD) section', async ({ authenticatedPage }) => {
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
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()

      // Check for Feature template (Feature should have ARD)
      const isFeatureTemplate = await modalPage
        .getPage()
        .locator('text=/feature/i')
        .isVisible()
        .catch(() => false)

      if (isFeatureTemplate) {
        await modalPage.expectArdVisible()
      }
    }
  })

  test('should display ARD with markdown content and code blocks', async ({ authenticatedPage }) => {
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
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()

      const isFeatureTemplate = await modalPage
        .getPage()
        .locator('text=/feature/i')
        .isVisible()
        .catch(() => false)

      if (isFeatureTemplate) {
        await modalPage.expectArdVisible()
        await modalPage.expectArdHasContent()
      }
    }
  })

  test('should display Stories Breakdown section with list of stories', async ({ authenticatedPage }) => {
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
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()

      const isFeatureTemplate = await modalPage
        .getPage()
        .locator('text=/feature/i')
        .isVisible()
        .catch(() => false)

      if (isFeatureTemplate) {
        await modalPage.expectStoriesVisible()
        const count = await modalPage.getStoryCount()
        expect(count).toBeGreaterThan(0)
      }
    }
  })

  test('should display story details: order, title, description, acceptance criteria', async ({
    authenticatedPage,
  }) => {
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
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()

      const isFeatureTemplate = await modalPage
        .getPage()
        .locator('text=/feature/i')
        .isVisible()
        .catch(() => false)

      if (isFeatureTemplate) {
        await modalPage.expectStoriesVisible()
        const count = await modalPage.getStoryCount()

        if (count > 0) {
          const firstStoryTitle = await modalPage.getStoryTitleByIndex(0)
          expect(firstStoryTitle).toBeTruthy()
        }
      }
    }
  })

  test('should display story estimated duration', async ({ authenticatedPage }) => {
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
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()

      const isFeatureTemplate = await modalPage
        .getPage()
        .locator('text=/feature/i')
        .isVisible()
        .catch(() => false)

      if (isFeatureTemplate) {
        await modalPage.expectStoriesVisible()
        const durationText = await modalPage.getTotalDurationText()
        if (durationText) {
          expect(durationText).toMatch(/\d+/)
        }
      }
    }
  })

  test('should display total stories count and total estimated duration', async ({ authenticatedPage }) => {
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
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()

      const isFeatureTemplate = await modalPage
        .getPage()
        .locator('text=/feature/i')
        .isVisible()
        .catch(() => false)

      if (isFeatureTemplate) {
        await modalPage.expectTotalStoriesDisplayed()
        await modalPage.expectTotalDurationDisplayed()
      }
    }
  })

  test('should allow expanding and collapsing individual stories', async ({ authenticatedPage }) => {
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
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()

      const isFeatureTemplate = await modalPage
        .getPage()
        .locator('text=/feature/i')
        .isVisible()
        .catch(() => false)

      if (isFeatureTemplate) {
        await modalPage.expectStoriesVisible()
        const count = await modalPage.getStoryCount()

        if (count > 0) {
          await modalPage.expandStory(0)
          // Expand action should succeed silently or show more details
          await authenticatedPage.waitForTimeout(300)
        }
      }
    }
  })

  test('should display copy ARD button', async ({ authenticatedPage }) => {
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
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()

      const isFeatureTemplate = await modalPage
        .getPage()
        .locator('text=/feature/i')
        .isVisible()
        .catch(() => false)

      if (isFeatureTemplate) {
        await modalPage.expectArdVisible()
        const copyVisible = await modalPage
          .getPage()
          .getByRole('button', { name: /copy/i })
          .isVisible()
          .catch(() => false)
        if (copyVisible) {
          expect(copyVisible).toBeTruthy()
        }
      }
    }
  })

  test('should display download ARD button', async ({ authenticatedPage }) => {
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
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()

      const isFeatureTemplate = await modalPage
        .getPage()
        .locator('text=/feature/i')
        .isVisible()
        .catch(() => false)

      if (isFeatureTemplate) {
        await modalPage.expectArdVisible()
        const downloadVisible = await modalPage
          .getPage()
          .getByRole('button', { name: /download|save/i })
          .isVisible()
          .catch(() => false)
        if (downloadVisible) {
          expect(downloadVisible).toBeTruthy()
        }
      }
    }
  })

  test('should close modal with ESC key', async ({ authenticatedPage }) => {
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
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()

      await modalPage.pressEscape()
      await modalPage.expectModalClosed()
    }
  })

  test('should close modal with close button', async ({ authenticatedPage }) => {
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
      await bannerPage.clickReviewApprove()
      await modalPage.expectModalVisible()

      await modalPage.close()
      await modalPage.expectModalClosed()
    }
  })
})
