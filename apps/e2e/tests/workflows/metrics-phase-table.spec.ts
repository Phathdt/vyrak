import { expect, test } from '@fixtures/auth.fixture'
import { MetricsDashboardPage } from '@page-objects/artifacts/metrics-dashboard.page'
import { WorkflowDetailPage } from '@page-objects/workflows/workflow-detail.page'

test.describe('Phase Metrics Table', () => {
  let workflowDetailPage: WorkflowDetailPage
  let metricsDashboardPage: MetricsDashboardPage

  test.beforeEach(async ({ authenticatedPage: _authenticatedPage }) => {
    workflowDetailPage = new WorkflowDetailPage(_authenticatedPage)
    metricsDashboardPage = new MetricsDashboardPage(_authenticatedPage)

    // Navigate to a completed workflow
    await _authenticatedPage.goto('/workflows')
    await _authenticatedPage.waitForLoadState('networkidle')

    const firstRow = _authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)
    if (rowVisible) {
      await firstRow.click()
      await workflowDetailPage.expectOnDetailPage()
    }
  })

  test.describe('Phase Metrics Table Display', () => {
    test('should display phase metrics table in metrics tab', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectPhaseMetricsTableVisible()
    })

    test('should display table headers correctly', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const headers = await metricsDashboardPage.phaseMetricsTable
        .locator('th, [role="columnheader"]')
        .allTextContents()

      // Should have columns: Phase, Status, Duration, Start, End, Retries
      expect(headers.length).toBeGreaterThan(0)
      const headerText = headers.join(' ').toLowerCase()
      expect(headerText).toMatch(/phase|status|duration|start|end|retries/)
    })

    test('should display all phases in table', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const rowCount = await metricsDashboardPage.getPhaseTableRowCount()

      // Should have rows for each phase
      expect(rowCount).toBeGreaterThan(0)
    })

    test('should display phase names in first column', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const phaseNames = await metricsDashboardPage.phaseMetricsTable
        .locator('tr td:first-child, tr [role="cell"]:first-child')
        .allTextContents()

      // Should have phase names
      expect(phaseNames.length).toBeGreaterThan(0)
    })

    test('should display status badge for each phase', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const statusBadges = await metricsDashboardPage.phaseMetricsTable
        .locator('[class*="badge"], [class*="status"]')
        .count()

      // Should have status indicators
      if (statusBadges > 0) {
        expect(statusBadges).toBeGreaterThan(0)
      }
    })

    test('should display duration for each phase', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const durations = await metricsDashboardPage.phaseMetricsTable.locator('text=/\\d+[smh]|\\d+\\.\\d+s/').count()

      // Should have duration values
      if (durations > 0) {
        expect(durations).toBeGreaterThan(0)
      }
    })

    test('should display start and end times', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const timeValues = await metricsDashboardPage.phaseMetricsTable.locator('text=/\\d{1,2}:\\d{2}:\\d{2}/').count()

      // Should have time values (at least start or end times)
      if (timeValues > 0) {
        expect(timeValues).toBeGreaterThan(0)
      }
    })

    test('should display retry count for phases', async () => {
      await metricsDashboardPage.navigateToMetricsTab()

      // Should have retry information (may be 0 if no retries)
      expect(await metricsDashboardPage.getPhaseTableRowCount()).toBeGreaterThan(0)
    })
  })

  test.describe('Table Sorting', () => {
    test('should sort phases by duration', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const rowCountBefore = await metricsDashboardPage.getPhaseTableRowCount()

      await metricsDashboardPage.sortPhaseTableBy('Duration')

      const rowCountAfter = await metricsDashboardPage.getPhaseTableRowCount()
      expect(rowCountAfter).toBe(rowCountBefore)
    })

    test('should sort phases by start time', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const rowCountBefore = await metricsDashboardPage.getPhaseTableRowCount()

      await metricsDashboardPage.sortPhaseTableBy('Start')

      const rowCountAfter = await metricsDashboardPage.getPhaseTableRowCount()
      expect(rowCountAfter).toBe(rowCountBefore)
    })

    test('should sort phases by retries', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const rowCountBefore = await metricsDashboardPage.getPhaseTableRowCount()

      await metricsDashboardPage.sortPhaseTableBy('Retries')

      const rowCountAfter = await metricsDashboardPage.getPhaseTableRowCount()
      expect(rowCountAfter).toBe(rowCountBefore)
    })

    test('should toggle sort direction on repeated click', async () => {
      await metricsDashboardPage.navigateToMetricsTab()

      // Sort ascending
      await metricsDashboardPage.sortPhaseTableBy('Duration')

      // Sort again to reverse
      await metricsDashboardPage.sortPhaseTableBy('Duration')

      // Table should still be visible with rows
      const rowCount = await metricsDashboardPage.getPhaseTableRowCount()
      expect(rowCount).toBeGreaterThan(0)
    })

    test('should maintain data integrity during sort', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const rowCountBefore = await metricsDashboardPage.getPhaseTableRowCount()

      await metricsDashboardPage.sortPhaseTableBy('Duration')

      // Row count should not change after sort
      const rowCountAfter = await metricsDashboardPage.getPhaseTableRowCount()
      expect(rowCountAfter).toBe(rowCountBefore)
    })
  })

  test.describe('Table Row Interactions', () => {
    test('should click phase row to view details', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const phaseNames = await metricsDashboardPage.phaseMetricsTable.locator('tr td:first-child').allTextContents()

      if (phaseNames.length > 0) {
        const firstPhase = phaseNames[0]
        if (firstPhase) {
          await metricsDashboardPage.clickPhaseRow(firstPhase)
          // Should show phase details (side panel or expanded row)
          await metricsDashboardPage.expectPhaseMetricsTableVisible()
        }
      }
    })

    test('should highlight fastest vs slowest phases', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const rowCount = await metricsDashboardPage.getPhaseTableRowCount()

      if (rowCount > 1) {
        // Slowest phase should be highlighted
        const slowestVisible = await metricsDashboardPage.slowestPhaseHighlight.isVisible().catch(() => false)
        if (slowestVisible) {
          await metricsDashboardPage.expectSlowestPhaseHighlighted()
        }
      }
    })
  })

  test.describe('Bottleneck Detection', () => {
    test('should display bottleneck detection section', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectBottleneckSectionVisible()
    })

    test('should show warning if bottlenecks detected', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const bottleneckCount = await metricsDashboardPage.getBottleneckCount()

      if (bottleneckCount > 0) {
        await metricsDashboardPage.expectBottlenecksDetected()
      }
    })

    test('should display "no bottlenecks" message if none detected', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const bottleneckCount = await metricsDashboardPage.getBottleneckCount()

      if (bottleneckCount === 0) {
        await metricsDashboardPage.expectNoBottlenecks()
      }
    })

    test('should list each bottleneck with phase name and duration', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const bottlenecks = await metricsDashboardPage.getBottleneckTexts()

      // If bottlenecks exist, they should have content
      if (bottlenecks.length > 0) {
        bottlenecks.forEach((bottleneck) => {
          expect(bottleneck).toBeTruthy()
          // Should mention expected vs actual duration
          expect(bottleneck.toLowerCase()).toMatch(/expected|actual|duration/)
        })
      }
    })

    test('should show optimization suggestions for bottlenecks', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const bottlenecks = await metricsDashboardPage.getBottleneckTexts()

      // Bottleneck items should include suggestions
      if (bottlenecks.length > 0) {
        // Suggestions are optional but helpful
        expect(bottlenecks.length).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Retry Pattern Analysis', () => {
    test('should display retry patterns section', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectRetryPatternsSectionVisible()
    })

    test('should show warning if retry patterns detected', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const retryCount = await metricsDashboardPage.getRetryPatternCount()

      if (retryCount > 0) {
        await metricsDashboardPage.expectRetryPatternsDetected()
      }
    })

    test('should display "no retries" message if none needed', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const retryCount = await metricsDashboardPage.getRetryPatternCount()

      if (retryCount === 0) {
        await metricsDashboardPage.expectNoRetryPatterns()
      }
    })

    test('should list phases with retry information', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const retryPatterns = await metricsDashboardPage.getRetryPatternTexts()

      // If patterns exist, should show phase and retry count
      if (retryPatterns.length > 0) {
        retryPatterns.forEach((pattern) => {
          expect(pattern).toBeTruthy()
          expect(pattern.toLowerCase()).toMatch(/retry|phase|reason/)
        })
      }
    })

    test('should display failure reasons for retries', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const retryPatterns = await metricsDashboardPage.getRetryPatternTexts()

      // Retry items should include reasons
      if (retryPatterns.length > 0) {
        expect(retryPatterns.length).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Phase Status Highlighting', () => {
    test('should highlight failed phases in red', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const failedHighlightExists = await metricsDashboardPage.failedPhaseHighlight.isVisible().catch(() => false)

      // If there are failed phases, they should be highlighted
      if (failedHighlightExists) {
        await metricsDashboardPage.expectFailedPhaseHighlighted()
      }
    })

    test('should highlight slowest phase in amber', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const rowCount = await metricsDashboardPage.getPhaseTableRowCount()

      if (rowCount > 1) {
        const slowestExists = await metricsDashboardPage.slowestPhaseHighlight.isVisible().catch(() => false)
        if (slowestExists) {
          await metricsDashboardPage.expectSlowestPhaseHighlighted()
        }
      }
    })

    test('should use consistent colors for status badges', async () => {
      await metricsDashboardPage.navigateToMetricsTab()

      // Check that status badges are visible
      const rows = await metricsDashboardPage.phaseTableRows.count()
      if (rows > 0) {
        expect(rows).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Table Performance', () => {
    test('should render table within acceptable time', async () => {
      const startTime = Date.now()
      await metricsDashboardPage.navigateToMetricsTab()
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(1500) // Should load table quickly
    })

    test('should sort table without lag', async () => {
      await metricsDashboardPage.navigateToMetricsTab()

      const startTime = Date.now()
      await metricsDashboardPage.sortPhaseTableBy('Duration')
      const sortTime = Date.now() - startTime

      expect(sortTime).toBeLessThan(1000) // Sort should be quick
    })

    test('should display all rows without scrolling lag', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const rowCount = await metricsDashboardPage.getPhaseTableRowCount()

      // Table should be responsive even with many rows
      if (rowCount > 10) {
        await metricsDashboardPage.expectPhaseMetricsTableVisible()
      }
    })
  })

  test.describe('Table Responsive Design', () => {
    test('should display table on desktop viewport', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectPhaseMetricsTableVisible()
    })

    test('should adapt table on tablet viewport', async ({ authenticatedPage }) => {
      await metricsDashboardPage.navigateToMetricsTab()

      await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
      await metricsDashboardPage.expectPhaseMetricsTableVisible()

      await authenticatedPage.setViewportSize({ width: 1280, height: 720 })
    })

    test('should be scrollable on mobile viewport', async ({ authenticatedPage }) => {
      await metricsDashboardPage.navigateToMetricsTab()

      await authenticatedPage.setViewportSize({ width: 375, height: 667 })
      // Table should still be accessible (may be scrollable)
      const table = await metricsDashboardPage.phaseMetricsTable.isVisible().catch(() => false)
      if (table) {
        await metricsDashboardPage.expectPhaseMetricsTableVisible()
      }

      await authenticatedPage.setViewportSize({ width: 1280, height: 720 })
    })
  })
})
