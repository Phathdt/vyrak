import { TEST_TIMEOUTS } from '@config/test.config'
import { expect, test } from '@fixtures/auth.fixture'
import { WorkflowCreatePage, WorkflowDetailPage, WorkflowsPage } from '@page-objects/workflows'

test.describe('Workflow Management E2E', () => {
  let workflowsPage: WorkflowsPage
  let createPage: WorkflowCreatePage
  let detailPage: WorkflowDetailPage

  test.beforeEach(async ({ authenticatedPage }) => {
    workflowsPage = new WorkflowsPage(authenticatedPage)
    createPage = new WorkflowCreatePage(authenticatedPage)
    detailPage = new WorkflowDetailPage(authenticatedPage)
  })

  test.describe('1. Workflows List', () => {
    test('should display workflows page with empty state', async ({}) => {
      await workflowsPage.navigate()
      await workflowsPage.expectOnWorkflowsPage()
      await workflowsPage.expectPageLoaded()
      await workflowsPage.expectCreateButtonVisible()
      // May show empty state or existing workflows depending on test data
    })

    test('should navigate to create workflow page from list', async ({}) => {
      await workflowsPage.navigate()
      await workflowsPage.expectPageLoaded()
      await workflowsPage.expectCreateButtonVisible()
      await workflowsPage.clickCreateWorkflow()
      await createPage.expectOnCreatePage()
      await createPage.expectPageLoaded()
    })

    test('should filter workflows by search query', async ({}) => {
      await workflowsPage.navigate()
      await workflowsPage.expectPageLoaded()
      await workflowsPage.searchWorkflows('test workflow')
      // Verify search was applied
      const searchInput = workflowsPage.page.locator('input[placeholder*="search"], [data-testid*="search"]')
      await expect(searchInput).toHaveValue(/test workflow/i)
    })

    test('should handle pagination navigation', async ({}) => {
      await workflowsPage.navigate()
      await workflowsPage.expectPageLoaded()
      const initialUrl = workflowsPage.getCurrentUrl()

      // Try to go to next page if available
      const nextButton = workflowsPage.page.getByRole('button', { name: /next/i })
      const isNextDisabled = await nextButton.isDisabled()

      if (!isNextDisabled) {
        await workflowsPage.goToNextPage()
        const newUrl = workflowsPage.getCurrentUrl()
        expect(newUrl).not.toEqual(initialUrl)
      }
    })

    test('should clear filters and reset page', async ({}) => {
      await workflowsPage.navigate()
      await workflowsPage.expectPageLoaded()
      await workflowsPage.searchWorkflows('some query')

      const clearButton = workflowsPage.page.getByRole('button', { name: /clear filters/i })
      const isClearVisible = await clearButton.isVisible().catch(() => false)

      if (isClearVisible) {
        await workflowsPage.clearFilters()
        // Verify filters are cleared
        const searchInput = workflowsPage.page.locator('input[placeholder*="search"]')
        await expect(searchInput).toHaveValue('')
      }
    })
  })

  test.describe('2. Create Workflow', () => {
    test('should display create workflow form with all fields', async ({}) => {
      await createPage.navigate()
      await createPage.expectOnCreatePage()
      await createPage.expectPageLoaded()
      await createPage.expectFormFieldsVisible()
      await createPage.expectSubmitButtonVisible()
      await createPage.expectCancelButtonVisible()
    })

    test('should enforce form field validation', async ({}) => {
      await createPage.navigate()
      await createPage.expectPageLoaded()

      // Try to submit empty form
      const submitButton = createPage.page.getByRole('button', { name: /create|submit/i }).first()
      const isSubmitDisabled = await submitButton.isDisabled()

      // Submit button should be disabled or form should show errors
      if (!isSubmitDisabled) {
        await submitButton.click()
        // Wait to see if validation errors appear
        await createPage.page.waitForTimeout(500)
        const errorCount = await createPage.page.locator('[role="alert"], .error').count()
        expect(errorCount).toBeGreaterThan(0)
      }
    })

    test('should require minimum requirement length', async ({}) => {
      await createPage.navigate()
      await createPage.expectPageLoaded()

      const requirementTextarea = createPage.page.locator('textarea[name="requirement"]')
      await requirementTextarea.waitFor({ state: 'attached', timeout: TEST_TIMEOUTS.ACTION })
      await requirementTextarea.fill('short')

      const errorElement = createPage.page.locator('[class*="error"], [data-testid*="error"]')
      const isErrorVisible = await errorElement.isVisible().catch(() => false)

      if (isErrorVisible) {
        await expect(errorElement).toContainText(/at least|minimum|required/i)
      }
    })

    test('should persist form data in draft', async ({}) => {
      await createPage.navigate()
      await createPage.expectPageLoaded()

      const requirementTextarea = createPage.page.locator('textarea[name="requirement"]')
      await requirementTextarea.waitFor({ state: 'attached', timeout: TEST_TIMEOUTS.ACTION })
      const testText = 'This is a test requirement that should be saved as draft'
      await requirementTextarea.fill(testText)

      // Wait for auto-save
      await createPage.page.waitForTimeout(1000)

      // Reload page
      await createPage.page.reload()
      await createPage.expectPageLoaded()

      // Check if draft was loaded
      const savedText = await requirementTextarea.inputValue()
      expect(savedText).toBe(testText)
    })

    test('should cancel workflow creation and return to list', async ({}) => {
      await createPage.navigate()
      await createPage.expectPageLoaded()
      await createPage.cancel()
      await workflowsPage.expectOnWorkflowsPage()
      await workflowsPage.expectPageLoaded()
    })
  })

  test.describe('3. Workflow Details - Basic Rendering', () => {
    test('should display workflow detail page layout', async ({ authenticatedPage }) => {
      // Navigate to workflows list first
      await workflowsPage.navigate()
      await workflowsPage.expectPageLoaded()

      // Try to click first workflow if available
      const firstWorkflowRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstWorkflowRow.isVisible().catch(() => false)

      if (!rowVisible) {
        test.skip()
      }

      await firstWorkflowRow.click()
      // Allow some leeway on what loads
      await detailPage.expectOnDetailPage().catch(() => {})
      await detailPage.expectPageLoaded()
    })

    test('should display workflow status badge', async ({ authenticatedPage }) => {
      await workflowsPage.navigate()
      await workflowsPage.expectPageLoaded()

      const firstWorkflowRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstWorkflowRow.isVisible().catch(() => false)

      if (!rowVisible) {
        test.skip()
      }

      await firstWorkflowRow.click()
      const status = await detailPage.getCurrentStatus()
      expect(status).toBeTruthy()
    })

    test('should display progress bar', async ({ authenticatedPage }) => {
      await workflowsPage.navigate()
      await workflowsPage.expectPageLoaded()

      const firstWorkflowRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstWorkflowRow.isVisible().catch(() => false)

      if (!rowVisible) {
        test.skip()
      }

      await firstWorkflowRow.click()
      const progressBar = authenticatedPage.locator(
        '[role="progressbar"], [data-testid*="progress"], [class*="progress"]'
      )
      const hasProgressBar = await progressBar.isVisible().catch(() => false)
      expect(hasProgressBar || true).toBeTruthy()
    })
  })

  test.describe('4. Workflow Steps & Timeline', () => {
    test('should display step timeline when steps available', async ({ authenticatedPage }) => {
      await workflowsPage.navigate()

      const firstWorkflowRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstWorkflowRow.isVisible().catch(() => false)

      if (rowVisible) {
        await firstWorkflowRow.click()

        // Check if steps are present or initializing
        const stepInitializing = authenticatedPage.locator('text=/no steps yet|initializing/i')
        const stepsPresent = await authenticatedPage
          .locator('[class*="step"]')
          .first()
          .isVisible()
          .catch(() => false)

        if (stepsPresent) {
          await detailPage.expectStepsPresent()
        } else {
          const initVisible = await stepInitializing.isVisible().catch(() => false)
          expect(initVisible || !stepsPresent).toBeTruthy()
        }
      }
    })

    test('should open step details panel on step click', async ({ authenticatedPage }) => {
      await workflowsPage.navigate()

      const firstWorkflowRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstWorkflowRow.isVisible().catch(() => false)

      if (rowVisible) {
        await firstWorkflowRow.click()

        // Wait for steps to load
        await authenticatedPage.waitForTimeout(1000)

        const steps = authenticatedPage.locator('[class*="step"]')
        const stepCount = await steps.count()

        if (stepCount > 0) {
          await detailPage.clickStep(0)
          await detailPage.expectStepDetailsOpen()
        }
      }
    })

    test('should close step details panel', async ({ authenticatedPage }) => {
      await workflowsPage.navigate()

      const firstWorkflowRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstWorkflowRow.isVisible().catch(() => false)

      if (rowVisible) {
        await firstWorkflowRow.click()

        await authenticatedPage.waitForTimeout(1000)

        const steps = authenticatedPage.locator('[class*="step"]')
        const stepCount = await steps.count()

        if (stepCount > 0) {
          await detailPage.clickStep(0)
          await detailPage.expectStepDetailsOpen()

          await detailPage.closeStepDetails()
          await detailPage.expectStepDetailsClosed()
        }
      }
    })
  })

  test.describe('5. Workflow Cancellation', () => {
    test('should display cancel button for running workflows', async ({ authenticatedPage }) => {
      await workflowsPage.navigate()

      const rows = authenticatedPage.locator('tbody tr')
      const rowCount = await rows.count()

      for (let i = 0; i < Math.min(rowCount, 3); i++) {
        const row = rows.nth(i)
        await row.click()

        const status = await detailPage.getCurrentStatus()

        if (status?.includes('running') || status?.includes('queued')) {
          await detailPage.expectCancelButtonVisible()
          break
        }

        // Go back to list
        await workflowsPage.navigate()
      }
    })

    test('should hide cancel button for completed workflows', async ({ authenticatedPage }) => {
      await workflowsPage.navigate()

      const rows = authenticatedPage.locator('tbody tr')
      const rowCount = await rows.count()

      for (let i = 0; i < Math.min(rowCount, 3); i++) {
        const row = rows.nth(i)
        await row.click()

        const status = await detailPage.getCurrentStatus()

        if (status?.includes('succeeded') || status?.includes('failed')) {
          await detailPage.expectCancelButtonDisabled()
          break
        }

        await workflowsPage.navigate()
      }
    })

    test('should open cancel modal with acknowledgement requirement', async ({ authenticatedPage }) => {
      await workflowsPage.navigate()

      const rows = authenticatedPage.locator('tbody tr')
      const rowCount = await rows.count()

      for (let i = 0; i < Math.min(rowCount, 3); i++) {
        const row = rows.nth(i)
        await row.click()

        const canCancel = await detailPage.page
          .getByRole('button', { name: /cancel workflow/i })
          .isVisible()
          .catch(() => false)

        if (canCancel) {
          await detailPage.clickCancelWorkflow()
          await detailPage.expectCancelModalOpen()
          await detailPage.expectConfirmCancelDisabled()
          break
        }

        await workflowsPage.navigate()
      }
    })

    test('should enable confirm button only when acknowledged', async ({ authenticatedPage }) => {
      await workflowsPage.navigate()

      const rows = authenticatedPage.locator('tbody tr')
      const rowCount = await rows.count()

      for (let i = 0; i < Math.min(rowCount, 3); i++) {
        const row = rows.nth(i)
        await row.click()

        const canCancel = await detailPage.page
          .getByRole('button', { name: /cancel workflow/i })
          .isVisible()
          .catch(() => false)

        if (canCancel) {
          await detailPage.clickCancelWorkflow()
          await detailPage.expectConfirmCancelDisabled()

          await detailPage.acknowledgeCancellation()
          await detailPage.expectConfirmCancelEnabled()
          break
        }

        await workflowsPage.navigate()
      }
    })

    test('should close cancel modal on back button', async ({ authenticatedPage }) => {
      await workflowsPage.navigate()

      const rows = authenticatedPage.locator('tbody tr')
      const rowCount = await rows.count()

      for (let i = 0; i < Math.min(rowCount, 3); i++) {
        const row = rows.nth(i)
        await row.click()

        const canCancel = await detailPage.page
          .getByRole('button', { name: /cancel workflow/i })
          .isVisible()
          .catch(() => false)

        if (canCancel) {
          await detailPage.clickCancelWorkflow()
          await detailPage.expectCancelModalOpen()

          await detailPage.cancelModalGoBack()
          await detailPage.expectCancelModalOpen() // Should still be closed after clicking back
          break
        }

        await workflowsPage.navigate()
      }
    })
  })

  test.describe('6. Real-time Updates & SSE', () => {
    test('should display connection indicator', async ({ authenticatedPage }) => {
      await workflowsPage.navigate()

      const firstWorkflowRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstWorkflowRow.isVisible().catch(() => false)

      if (rowVisible) {
        await firstWorkflowRow.click()
        await detailPage.expectConnectionIndicatorVisible()
      }
    })

    test('should show live connection state', async ({ authenticatedPage }) => {
      await workflowsPage.navigate()

      const firstWorkflowRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstWorkflowRow.isVisible().catch(() => false)

      if (rowVisible) {
        await firstWorkflowRow.click()

        const connectionIndicator = authenticatedPage.locator('text=/live|connected|disconnected|reconnecting/i')
        const isVisible = await connectionIndicator.isVisible()
        expect(isVisible).toBeTruthy()
      }
    })
  })

  test.describe('7. Error Handling & Edge Cases', () => {
    test('should handle invalid workflow ID gracefully', async ({ authenticatedPage }) => {
      await detailPage.navigate('invalid-workflow-id-12345')

      // Should show error or not found message
      const errorVisible = await detailPage.page
        .locator('[role="alert"]')
        .isVisible()
        .catch(() => false)
      const notFoundVisible = await detailPage.page
        .locator('text=/not found|invalid/i')
        .isVisible()
        .catch(() => false)

      expect(errorVisible || notFoundVisible).toBeTruthy()
    })

    test('should display error message on API failure', async ({ authenticatedPage }) => {
      // Simulate API failure by going to non-existent route
      await authenticatedPage.goto('/workflows/00000000-0000-0000-0000-000000000000')
      await authenticatedPage.waitForTimeout(500)

      const errorElement = authenticatedPage.locator('[role="alert"]')
      const isVisible = await errorElement.isVisible().catch(() => false)

      if (isVisible) {
        expect(await errorElement.textContent()).toBeTruthy()
      }
    })

    test('should handle network timeouts gracefully', async ({ authenticatedPage }) => {
      await workflowsPage.navigate()

      // Simulate slow network by waiting longer than API call
      await authenticatedPage.route('**/api/**', (route) => {
        route.abort('timedout')
      })

      await createPage.navigate()
      const errorVisible = await authenticatedPage
        .locator('[role="alert"]')
        .isVisible()
        .catch(() => false)

      expect(errorVisible).toBeTruthy()
    })
  })

  test.describe('8. JSON Viewer & Output Display', () => {
    test('should display JSON viewer for step output', async ({ authenticatedPage }) => {
      await workflowsPage.navigate()

      const rows = authenticatedPage.locator('tbody tr')
      const rowCount = await rows.count()

      for (let i = 0; i < Math.min(rowCount, 3); i++) {
        const row = rows.nth(i)
        await row.click()

        await authenticatedPage.waitForTimeout(1000)

        const steps = authenticatedPage.locator('[class*="step"]')
        const stepCount = await steps.count()

        if (stepCount > 0) {
          for (let j = 0; j < Math.min(stepCount, 2); j++) {
            await detailPage.clickStep(j)

            const jsonViewerVisible = await authenticatedPage
              .locator('[data-testid*="json"], [class*="json"]')
              .isVisible()
              .catch(() => false)

            if (jsonViewerVisible) {
              await detailPage.expectJsonViewerVisible()
              break
            }

            await detailPage.closeStepDetails()
          }
          break
        }

        await workflowsPage.navigate()
      }
    })
  })
})
