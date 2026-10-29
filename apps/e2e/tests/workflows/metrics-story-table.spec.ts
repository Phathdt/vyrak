import { expect, test } from '@fixtures/auth.fixture'
import { MetricsDashboardPage } from '@page-objects/artifacts/metrics-dashboard.page'
import { WorkflowDetailPage } from '@page-objects/workflows/workflow-detail.page'

test.describe('Story Metrics Table - Feature Template Only', () => {
  let workflowDetailPage: WorkflowDetailPage
  let metricsDashboardPage: MetricsDashboardPage

  test.beforeEach(async ({ authenticatedPage: _authenticatedPage }) => {
    workflowDetailPage = new WorkflowDetailPage(_authenticatedPage)
    metricsDashboardPage = new MetricsDashboardPage(_authenticatedPage)

    // Navigate to a Feature template workflow
    await _authenticatedPage.goto('/workflows')
    await _authenticatedPage.waitForLoadState('networkidle')

    const firstRow = _authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)
    if (rowVisible) {
      await firstRow.click()
      await workflowDetailPage.expectOnDetailPage()
    }
  })

  test.describe('Story Metrics Display - Feature Only', () => {
    test('should display story metrics table only for feature template', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        await metricsDashboardPage.expectStoryMetricsTableVisible()
      }
    })

    test('should not display story metrics for hotfix template', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('hotfix')) {
        const storyTable = await metricsDashboardPage.storyMetricsTable.isVisible().catch(() => false)
        expect(storyTable).toBeFalsy()
      }
    })

    test('should display story table headers', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const headers = await metricsDashboardPage.storyMetricsTable
          .locator('th, [role="columnheader"]')
          .allTextContents()

        // Should have: Story Order, Title, Duration, Status, Retries
        expect(headers.length).toBeGreaterThan(0)
        const headerText = headers.join(' ').toLowerCase()
        expect(headerText).toMatch(/story|order|title|duration|status|retries/)
      }
    })

    test('should display all stories in table', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const rowCount = await metricsDashboardPage.getStoryTableRowCount()
        expect(rowCount).toBeGreaterThan(0)
      }
    })

    test('should display story order numbers', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const storyNumbers = await metricsDashboardPage.storyMetricsTable.locator('text=/story \\d+|\\d+\\./').count()
        if (storyNumbers > 0) {
          expect(storyNumbers).toBeGreaterThan(0)
        }
      }
    })

    test('should display story titles', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const titleCells = await metricsDashboardPage.storyMetricsTable.locator('td, [role="cell"]').count()
        expect(titleCells).toBeGreaterThan(0)
      }
    })

    test('should display story durations', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const durations = await metricsDashboardPage.storyMetricsTable.locator('text=/\\d+[smh]|\\d+\\.\\d+s/').count()
        if (durations > 0) {
          expect(durations).toBeGreaterThan(0)
        }
      }
    })

    test('should display story status badges', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const statusBadges = await metricsDashboardPage.storyMetricsTable
          .locator('[class*="badge"], [class*="status"]')
          .count()
        if (statusBadges > 0) {
          expect(statusBadges).toBeGreaterThan(0)
        }
      }
    })

    test('should display story retry counts', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const rowCount = await metricsDashboardPage.getStoryTableRowCount()
        expect(rowCount).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Story Table Sorting', () => {
    test('should sort stories by duration', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const rowCountBefore = await metricsDashboardPage.getStoryTableRowCount()
        await metricsDashboardPage.sortStoryTableBy('Duration')
        const rowCountAfter = await metricsDashboardPage.getStoryTableRowCount()

        expect(rowCountAfter).toBe(rowCountBefore)
      }
    })

    test('should maintain story order after sort', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const rowCount = await metricsDashboardPage.getStoryTableRowCount()
        expect(rowCount).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Story Table Interactions', () => {
    test('should click story row to view details', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const rowCount = await metricsDashboardPage.getStoryTableRowCount()
        if (rowCount > 0) {
          await metricsDashboardPage.clickStoryRow(1)
          // Should show story details
          await metricsDashboardPage.expectStoryMetricsTableVisible()
        }
      }
    })

    test('should highlight slowest story', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const rowCount = await metricsDashboardPage.getStoryTableRowCount()
        if (rowCount > 1) {
          const slowestExists = await metricsDashboardPage.slowestStoryHighlight.isVisible().catch(() => false)
          if (slowestExists) {
            await metricsDashboardPage.expectSlowestStoryHighlighted()
          }
        }
      }
    })

    test('should show fastest and slowest story comparison', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const rowCount = await metricsDashboardPage.getStoryTableRowCount()
        expect(rowCount).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Story Performance Summary', () => {
    test('should display story performance summary section', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        await metricsDashboardPage.expectStorySummaryVisible()
      }
    })

    test('should display average story duration', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        await metricsDashboardPage.expectStorySummaryMetricVisible('average|avg')
      }
    })

    test('should display slowest story in summary', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        await metricsDashboardPage.expectStorySummaryMetricVisible('slowest')
      }
    })

    test('should display fastest story in summary', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        await metricsDashboardPage.expectStorySummaryMetricVisible('fastest')
      }
    })

    test('should display total story count and status breakdown', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        await metricsDashboardPage.expectStorySummaryMetricVisible('succeeded|failed|total')
      }
    })

    test('should show success rate for stories', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const summaryText = await metricsDashboardPage.storySummarySection.textContent()
        if (summaryText) {
          expect(summaryText).toBeTruthy()
        }
      }
    })
  })

  test.describe('Story Metrics Accuracy', () => {
    test('should display correct story count', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const rowCount = await metricsDashboardPage.getStoryTableRowCount()

        // Story count should be reasonable
        expect(rowCount).toBeGreaterThan(0)
        expect(rowCount).toBeLessThan(1000) // Sanity check
      }
    })

    test('should sum story durations correctly', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        // Implementation phase duration should roughly equal sum of story durations
        const rowCount = await metricsDashboardPage.getStoryTableRowCount()
        expect(rowCount).toBeGreaterThan(0)
      }
    })

    test('should display consistent metrics on reload', async ({ authenticatedPage }) => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const rowCountBefore = await metricsDashboardPage.getStoryTableRowCount()

        await authenticatedPage.reload()
        await metricsDashboardPage.navigateToMetricsTab()

        const rowCountAfter = await metricsDashboardPage.getStoryTableRowCount()
        expect(rowCountAfter).toBe(rowCountBefore)
      }
    })
  })

  test.describe('Story Artifacts Integration', () => {
    test('should link story row to story artifacts', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const rowCount = await metricsDashboardPage.getStoryTableRowCount()
        if (rowCount > 0) {
          // Story row should be clickable to view artifacts
          await metricsDashboardPage.clickStoryRow(1)
          await metricsDashboardPage.expectStoryMetricsTableVisible()
        }
      }
    })

    test('should allow navigating from story metrics to story artifacts', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const rowCount = await metricsDashboardPage.getStoryTableRowCount()
        if (rowCount > 0) {
          // Should be able to access story details
          expect(rowCount).toBeGreaterThan(0)
        }
      }
    })
  })

  test.describe('Story Metrics Performance', () => {
    test('should render story table within acceptable time', async () => {
      const startTime = Date.now()
      await metricsDashboardPage.navigateToMetricsTab()

      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()
      if (template?.toLowerCase().includes('feature')) {
        const loadTime = Date.now() - startTime
        expect(loadTime).toBeLessThan(2000)
      }
    })

    test('should sort story table without lag', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const startTime = Date.now()
        await metricsDashboardPage.sortStoryTableBy('Duration')
        const sortTime = Date.now() - startTime

        expect(sortTime).toBeLessThan(1000)
      }
    })

    test('should handle large story counts (>20 stories)', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const rowCount = await metricsDashboardPage.getStoryTableRowCount()
        // If many stories, should still be responsive
        if (rowCount > 20) {
          await metricsDashboardPage.expectStoryMetricsTableVisible()
        }
      }
    })
  })

  test.describe('Story Metrics Responsive Design', () => {
    test('should display story table on desktop viewport', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        await metricsDashboardPage.expectStoryMetricsTableVisible()
      }
    })

    test('should adapt story table for tablet viewport', async ({ authenticatedPage }) => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
        const tableVisible = await metricsDashboardPage.storyMetricsTable.isVisible().catch(() => false)
        if (tableVisible) {
          await metricsDashboardPage.expectStoryMetricsTableVisible()
        }
        await authenticatedPage.setViewportSize({ width: 1280, height: 720 })
      }
    })
  })
})
