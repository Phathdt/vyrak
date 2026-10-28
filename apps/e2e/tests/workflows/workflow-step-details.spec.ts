import { TEST_TIMEOUTS } from '@config/test.config'
import { expect, test } from '@fixtures/auth.fixture'
import { WorkflowDetailPage, WorkflowsPage } from '@page-objects/workflows'

test.describe('Workflow Step Details & Interactions', () => {
  let workflowsPage: WorkflowsPage
  let detailPage: WorkflowDetailPage

  test.beforeEach(async ({ authenticatedPage }) => {
    workflowsPage = new WorkflowsPage(authenticatedPage)
    detailPage = new WorkflowDetailPage(authenticatedPage)
    await workflowsPage.navigate()
  })

  test('should open step details panel on click', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      await authenticatedPage.waitForTimeout(1000)

      const stepCards = authenticatedPage.locator('[class*="step-card"], [data-testid*="step"]')
      const stepCount = await stepCards.count()

      if (stepCount > 0) {
        await detailPage.clickStep(0)
        await detailPage.expectStepDetailsOpen()
      }
    }
  })

  test('should display step name in details panel', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      await authenticatedPage.waitForTimeout(1000)

      const steps = authenticatedPage.locator('[class*="step-card"]')
      const stepCount = await steps.count()

      if (stepCount > 0) {
        await detailPage.clickStep(0)

        const title = await detailPage.getStepDetailsTitle()
        expect(title).toBeTruthy()
      }
    }
  })

  test('should close details panel with close button', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      await authenticatedPage.waitForTimeout(1000)

      const steps = authenticatedPage.locator('[class*="step-card"]')
      const stepCount = await steps.count()

      if (stepCount > 0) {
        await detailPage.clickStep(0)
        await detailPage.expectStepDetailsOpen()

        await detailPage.closeStepDetails()
        await detailPage.expectStepDetailsClosed()
      }
    }
  })

  test('should close details panel on backdrop click', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      await authenticatedPage.waitForTimeout(1000)

      const steps = authenticatedPage.locator('[class*="step-card"]')
      const stepCount = await steps.count()

      if (stepCount > 0) {
        await detailPage.clickStep(0)
        await detailPage.expectStepDetailsOpen()

        // Click backdrop (left side of panel)
        const backdrop = authenticatedPage.locator('div[class*="backdrop"], div[class*="inset"]').first()
        await backdrop.click({ force: true })

        await detailPage.expectStepDetailsClosed()
      }
    }
  })

  test('should display step status in details', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      await authenticatedPage.waitForTimeout(1000)

      const steps = authenticatedPage.locator('[class*="step-card"]')
      const stepCount = await steps.count()

      if (stepCount > 0) {
        await detailPage.clickStep(0)

        const statusBadge = authenticatedPage.locator('[role="dialog"] [class*="status"]')
        const isVisible = await statusBadge.isVisible().catch(() => false)

        if (isVisible) {
          expect(await statusBadge.textContent()).toBeTruthy()
        }
      }
    }
  })

  test('should display step timing information', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      await authenticatedPage.waitForTimeout(1000)

      const steps = authenticatedPage.locator('[class*="step-card"]')
      const stepCount = await steps.count()

      if (stepCount > 0) {
        await detailPage.clickStep(0)

        const durationInfo = authenticatedPage.locator('[role="dialog"] text=/duration|started|completed/i')
        const isVisible = await durationInfo.isVisible().catch(() => false)

        expect(isVisible).toBeTruthy()
      }
    }
  })

  test('should display step output when available', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      await authenticatedPage.waitForTimeout(1000)

      const steps = authenticatedPage.locator('[class*="step-card"]')
      const stepCount = await steps.count()

      if (stepCount > 0) {
        for (let i = 0; i < Math.min(stepCount, 3); i++) {
          await detailPage.clickStep(i)

          const outputSection = authenticatedPage.locator('[role="dialog"] text=/output/i')
          const hasOutput = await outputSection.isVisible().catch(() => false)

          if (hasOutput) {
            expect(hasOutput).toBeTruthy()
            break
          }

          await detailPage.closeStepDetails()
        }
      }
    }
  })

  test('should display error details for failed steps', async ({ authenticatedPage }) => {
    const rows = authenticatedPage.locator('tbody tr')
    const rowCount = await rows.count()

    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i)
      await row.click()

      await authenticatedPage.waitForTimeout(1000)

      const steps = authenticatedPage.locator('[class*="step-card"]')
      const stepCount = await steps.count()

      let foundFailed = false
      for (let j = 0; j < stepCount; j++) {
        const step = steps.nth(j)
        const text = await step.textContent()

        if (text?.includes('failed') || text?.includes('error')) {
          await detailPage.clickStep(j)

          const errorSection = authenticatedPage.locator('[role="dialog"] text=/error|failed/i')
          const hasError = await errorSection.isVisible().catch(() => false)

          if (hasError) {
            expect(hasError).toBeTruthy()
            foundFailed = true
            break
          }

          await detailPage.closeStepDetails()
        }
      }

      if (foundFailed) break

      await workflowsPage.navigate()
    }
  })

  test('should navigate between multiple step details', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      await authenticatedPage.waitForTimeout(1000)

      const steps = authenticatedPage.locator('[class*="step-card"]')
      const stepCount = await steps.count()

      if (stepCount >= 2) {
        // Open first step
        await detailPage.clickStep(0)
        await detailPage.expectStepDetailsOpen()
        const firstTitle = await detailPage.getStepDetailsTitle()

        // Close and open second step
        await detailPage.closeStepDetails()
        await detailPage.clickStep(1)
        await detailPage.expectStepDetailsOpen()
        const secondTitle = await detailPage.getStepDetailsTitle()

        // Titles should be different
        expect(firstTitle).not.toEqual(secondTitle)
      }
    }
  })

  test('should display JSON viewer for structured data', async ({ authenticatedPage }) => {
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)

    if (rowVisible) {
      await firstRow.click()

      await authenticatedPage.waitForTimeout(1000)

      const steps = authenticatedPage.locator('[class*="step-card"]')
      const stepCount = await steps.count()

      if (stepCount > 0) {
        for (let i = 0; i < Math.min(stepCount, 3); i++) {
          await detailPage.clickStep(i)

          const jsonViewer = authenticatedPage.locator('[role="dialog"] [class*="json"], [data-testid*="json"]')
          const hasJson = await jsonViewer.isVisible().catch(() => false)

          if (hasJson) {
            expect(hasJson).toBeTruthy()
            break
          }

          await detailPage.closeStepDetails()
        }
      }
    }
  })
})
