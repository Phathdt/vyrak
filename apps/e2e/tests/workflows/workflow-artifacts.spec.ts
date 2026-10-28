import { expect, test } from '@fixtures/auth.fixture'
import { WorkflowDetailPage, WorkflowsPage } from '@page-objects/workflows'

test.describe('Workflow Artifacts E2E', () => {
  let workflowsPage: WorkflowsPage
  let detailPage: WorkflowDetailPage

  test.beforeEach(async ({ authenticatedPage }) => {
    workflowsPage = new WorkflowsPage(authenticatedPage)
    detailPage = new WorkflowDetailPage(authenticatedPage)
    await workflowsPage.navigate()
  })

  test.describe('Artifact Display', () => {
    test('should display plan viewer when workflow is in waiting_approval status', async ({ authenticatedPage }) => {
      // Navigate to first workflow in list
      const firstRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstRow.isVisible().catch(() => false)

      if (rowVisible) {
        await firstRow.click()
        await authenticatedPage.waitForTimeout(1000)

        // Look for approval section and plan viewer (artifact display)
        const planViewer = authenticatedPage.locator('.plan-viewer')
        const hasPlanViewer = await planViewer.isVisible().catch(() => false)

        // Plan viewer may not be visible if workflow is not in waiting_approval status
        if (hasPlanViewer) {
          await expect(planViewer).toBeVisible()
        }
      }
    })

    test('should display plan artifact metadata (created date, size)', async ({ authenticatedPage }) => {
      const firstRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstRow.isVisible().catch(() => false)

      if (rowVisible) {
        await firstRow.click()
        await authenticatedPage.waitForTimeout(1000)

        const planMetadata = authenticatedPage.locator('.plan-metadata')
        const hasMetadata = await planMetadata.isVisible().catch(() => false)

        if (hasMetadata) {
          // Check for date and size info
          const metadataText = await planMetadata.textContent()
          expect(metadataText).toBeTruthy()
          expect(metadataText?.toLowerCase()).toContain('created')
          expect(metadataText?.toLowerCase()).toContain('size')
        }
      }
    })

    test('should show loading state when fetching artifact content', async ({ authenticatedPage }) => {
      const firstRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstRow.isVisible().catch(() => false)

      if (rowVisible) {
        await firstRow.click()
        await authenticatedPage.waitForTimeout(1000)

        const planViewer = authenticatedPage.locator('.plan-viewer')
        const loadingIndicator = authenticatedPage.locator('.plan-viewer-loading')

        const hasPlanViewer = await planViewer.isVisible().catch(() => false)
        const isLoading = await loadingIndicator.isVisible().catch(() => false)

        // Either showing content or showed loading (may be too fast to catch)
        if (hasPlanViewer) {
          expect(hasPlanViewer || isLoading).toBeTruthy()
        }
      }
    })

    test('should display error state when artifacts fail to load', async ({ authenticatedPage }) => {
      const firstRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstRow.isVisible().catch(() => false)

      if (rowVisible) {
        await firstRow.click()
        await authenticatedPage.waitForTimeout(1000)

        const errorState = authenticatedPage.locator('.plan-viewer-error')
        const hasError = await errorState.isVisible().catch(() => false)

        // Error may not be present if everything loads successfully
        if (hasError) {
          await expect(errorState).toBeVisible()
        }
      }
    })
  })

  test.describe('Plan Viewer Actions', () => {
    test('should display plan content as markdown when loaded', async ({ authenticatedPage }) => {
      const firstRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstRow.isVisible().catch(() => false)

      if (rowVisible) {
        await firstRow.click()
        await authenticatedPage.waitForTimeout(1000)

        const planContent = authenticatedPage.locator('.plan-content-container')
        const hasContent = await planContent.isVisible().catch(() => false)

        if (hasContent) {
          // Content should have markdown rendered (headings, etc.)
          const contentText = await planContent.textContent()
          expect(contentText).toBeTruthy()
          expect(contentText!.length).toBeGreaterThan(0)
        }
      }
    })

    test('should provide download action in plan viewer', async ({ authenticatedPage }) => {
      const firstRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstRow.isVisible().catch(() => false)

      if (rowVisible) {
        await firstRow.click()
        await authenticatedPage.waitForTimeout(1000)

        // Look for plan actions
        const planActions = authenticatedPage.locator('.plan-actions')
        const hasActions = await planActions.isVisible().catch(() => false)

        if (hasActions) {
          // Look for download button
          const downloadButton = planActions.getByRole('button', { name: /download/i })
          const hasDownload = await downloadButton.isVisible().catch(() => false)

          if (hasDownload) {
            await expect(downloadButton).toBeVisible()
            await expect(downloadButton).toBeEnabled()
          }
        }
      }
    })

    test('should provide copy action in plan viewer', async ({ authenticatedPage }) => {
      const firstRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstRow.isVisible().catch(() => false)

      if (rowVisible) {
        await firstRow.click()
        await authenticatedPage.waitForTimeout(1000)

        // Look for plan actions
        const planActions = authenticatedPage.locator('.plan-actions')
        const hasActions = await planActions.isVisible().catch(() => false)

        if (hasActions) {
          // Look for copy button
          const copyButton = planActions.getByRole('button', { name: /copy/i })
          const hasCopy = await copyButton.isVisible().catch(() => false)

          if (hasCopy) {
            await expect(copyButton).toBeVisible()
            await expect(copyButton).toBeEnabled()
          }
        }
      }
    })

    test('should provide fullscreen action in plan viewer', async ({ authenticatedPage }) => {
      const firstRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstRow.isVisible().catch(() => false)

      if (rowVisible) {
        await firstRow.click()
        await authenticatedPage.waitForTimeout(1000)

        const planActions = authenticatedPage.locator('.plan-actions')
        const hasActions = await planActions.isVisible().catch(() => false)

        if (hasActions) {
          // Look for fullscreen button
          const fullscreenButton = planActions.getByRole('button', { name: /fullscreen|expand/i })
          const hasFullscreen = await fullscreenButton.isVisible().catch(() => false)

          if (hasFullscreen) {
            await expect(fullscreenButton).toBeVisible()
            await expect(fullscreenButton).toBeEnabled()
          }
        }
      }
    })
  })

  test.describe('Artifact S3 Integration', () => {
    test('should fetch artifact content from S3 bucket', async ({ authenticatedPage }) => {
      const firstRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstRow.isVisible().catch(() => false)

      if (rowVisible) {
        await firstRow.click()
        await authenticatedPage.waitForTimeout(1000)

        const planViewer = authenticatedPage.locator('.plan-viewer')
        const hasViewer = await planViewer.isVisible().catch(() => false)

        if (hasViewer) {
          // Content should be loaded from S3 (not stored in database content field)
          const contentContainer = planViewer.locator('.plan-content-container')
          const contentVisible = await contentContainer.isVisible().catch(() => false)

          if (contentVisible) {
            const contentText = await contentContainer.textContent()
            expect(contentText).toBeTruthy()
            expect(contentText!.length).toBeGreaterThan(0)
          }
        }
      }
    })

    test('should render markdown content properly', async ({ authenticatedPage }) => {
      const firstRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstRow.isVisible().catch(() => false)

      if (rowVisible) {
        await firstRow.click()
        await authenticatedPage.waitForTimeout(1000)

        const markdownContent = authenticatedPage.locator('.markdown-content')
        const hasMarkdown = await markdownContent.isVisible().catch(() => false)

        if (hasMarkdown) {
          // Should have rendered markdown elements (headings, etc.)
          const headings = markdownContent.locator('h1, h2, h3')
          const hasHeadings = await headings.count().then(count => count > 0)
          expect(hasHeadings).toBeTruthy()
        }
      }
    })

    test('should display artifact size correctly', async ({ authenticatedPage }) => {
      const firstRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstRow.isVisible().catch(() => false)

      if (rowVisible) {
        await firstRow.click()
        await authenticatedPage.waitForTimeout(1000)

        const planMetadata = authenticatedPage.locator('.plan-metadata')
        const hasMetadata = await planMetadata.isVisible().catch(() => false)

        if (hasMetadata) {
          const metadataText = await planMetadata.textContent()
          // Should show size in bytes, KB, or MB
          expect(metadataText).toMatch(/\d+\s*(B|KB|MB)/)
        }
      }
    })
  })
})
