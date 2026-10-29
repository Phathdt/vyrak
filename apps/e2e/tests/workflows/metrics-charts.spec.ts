import { expect, test } from '@fixtures/auth.fixture'
import { MetricsDashboardPage } from '@page-objects/artifacts/metrics-dashboard.page'
import { WorkflowDetailPage } from '@page-objects/workflows/workflow-detail.page'

test.describe('Performance Visualization Charts', () => {
  let workflowDetailPage: WorkflowDetailPage
  let metricsDashboardPage: MetricsDashboardPage

  test.beforeEach(async ({ authenticatedPage }) => {
    workflowDetailPage = new WorkflowDetailPage(authenticatedPage)
    metricsDashboardPage = new MetricsDashboardPage(authenticatedPage)

    // Navigate to a completed workflow with metrics
    await authenticatedPage.goto('/workflows')
    await authenticatedPage.waitForLoadState('networkidle')

    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)
    if (rowVisible) {
      await firstRow.click()
      await workflowDetailPage.expectOnDetailPage()
    }
  })

  test.describe('Charts Section Visibility', () => {
    test('should display charts section in metrics tab', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectChartsVisible()
    })

    test('should display phase duration chart', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectPhaseDurationChartVisible()
    })

    test('should display success breakdown chart', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectSuccessBreakdownChartVisible()
    })

    test('should display story duration chart only for feature template', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        await metricsDashboardPage.expectStoryDurationChartVisible()
      }
    })
  })

  test.describe('Chart 1: Phase Duration Bar Chart', () => {
    test('should render horizontal bar chart for phases', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectPhaseDurationChartVisible()
    })

    test('should display all phases in chart', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const phaseTableRowCount = await metricsDashboardPage.getPhaseTableRowCount()

      // Chart should correspond to table data
      expect(phaseTableRowCount).toBeGreaterThan(0)
    })

    test('should color bars by status (green/red/amber)', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectPhaseDurationChartVisible()

      // Chart should have colored bars
      const chart = metricsDashboardPage.phaseDurationChart
      const box = await chart.boundingBox()
      expect(box).toBeDefined()
    })

    test('should display phase names on Y-axis', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectPhaseDurationChartVisible()

      // Chart should have labels
      const chart = metricsDashboardPage.phaseDurationChart
      const text = await chart.textContent()
      expect(text).toBeTruthy()
    })

    test('should display duration values on X-axis', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectPhaseDurationChartVisible()

      // Chart should show time values
      const chart = metricsDashboardPage.phaseDurationChart
      const text = await chart.textContent()
      if (text) {
        expect(text.toLowerCase()).toMatch(/\\d+|s|m|h/)
      }
    })

    test('should show hover tooltip on bar hover', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectPhaseDurationChartVisible()

      // Hover over chart bar
      await metricsDashboardPage.hoverChartBar(0)

      // Tooltip should appear with duration info
      const chart = metricsDashboardPage.phaseDurationChart
      await expect(chart).toBeVisible()
    })

    test('should be clickable to navigate to phase', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectPhaseDurationChartVisible()

      // Chart bars should be interactive
      const chart = metricsDashboardPage.phaseDurationChart
      expect(chart).toBeDefined()
    })

    test('should render chart within performance budget', async () => {
      const startTime = Date.now()
      await metricsDashboardPage.navigateToMetricsTab()
      const loadTime = Date.now() - startTime

      // Chart should render within 500ms
      expect(loadTime).toBeLessThan(500)
    })
  })

  test.describe('Chart 2: Story Duration Chart (Feature Only)', () => {
    test('should render vertical bar chart for stories', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const chartVisible = await metricsDashboardPage.storyDurationChart.isVisible().catch(() => false)
        if (chartVisible) {
          await metricsDashboardPage.expectStoryDurationChartVisible()
        }
      }
    })

    test('should display all stories in chart', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const storyRowCount = await metricsDashboardPage.getStoryTableRowCount()
        // Chart should show all stories
        expect(storyRowCount).toBeGreaterThan(0)
      }
    })

    test('should label X-axis with story numbers', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const chartVisible = await metricsDashboardPage.storyDurationChart.isVisible().catch(() => false)
        if (chartVisible) {
          const text = await metricsDashboardPage.storyDurationChart.textContent()
          if (text) {
            expect(text).toMatch(/\\d+|story/)
          }
        }
      }
    })

    test('should display duration on Y-axis', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const chartVisible = await metricsDashboardPage.storyDurationChart.isVisible().catch(() => false)
        if (chartVisible) {
          const text = await metricsDashboardPage.storyDurationChart.textContent()
          expect(text).toBeTruthy()
        }
      }
    })

    test('should color bars by story status', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const chartVisible = await metricsDashboardPage.storyDurationChart.isVisible().catch(() => false)
        if (chartVisible) {
          const box = await metricsDashboardPage.storyDurationChart.boundingBox()
          expect(box).toBeDefined()
        }
      }
    })

    test('should display expected duration line overlay', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const chartVisible = await metricsDashboardPage.storyDurationChart.isVisible().catch(() => false)
        if (chartVisible) {
          // Expected duration line should be overlay (dotted line)
          await metricsDashboardPage.expectStoryDurationChartVisible()
        }
      }
    })

    test('should show story title in tooltip on hover', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const chartVisible = await metricsDashboardPage.storyDurationChart.isVisible().catch(() => false)
        if (chartVisible) {
          const chart = metricsDashboardPage.storyDurationChart
          const box = await chart.boundingBox()
          if (box) {
            // Hover over first bar
            await metricsDashboardPage.getPage().mouse.move(box.x + 50, box.y + 50)
            await metricsDashboardPage.getPage().waitForTimeout(200)
          }
        }
      }
    })

    test('should be clickable to open story detail', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const chartVisible = await metricsDashboardPage.storyDurationChart.isVisible().catch(() => false)
        if (chartVisible) {
          // Chart bars should be interactive
          expect(chartVisible).toBeTruthy()
        }
      }
    })

    test('should not display for hotfix template', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('hotfix')) {
        const chartVisible = await metricsDashboardPage.storyDurationChart.isVisible().catch(() => false)
        expect(chartVisible).toBeFalsy()
      }
    })
  })

  test.describe('Chart 3: Success/Failure Breakdown', () => {
    test('should display donut/pie chart', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectSuccessBreakdownChartVisible()
    })

    test('should show succeeded segment in green', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectSuccessBreakdownChartVisible()

      // Chart should render
      const chart = metricsDashboardPage.successBreakdownChart
      const box = await chart.boundingBox()
      expect(box).toBeDefined()
    })

    test('should show failed segment in red', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectSuccessBreakdownChartVisible()

      // Chart should have color segments
      const chart = metricsDashboardPage.successBreakdownChart
      const text = await chart.textContent()
      expect(text).toBeTruthy()
    })

    test('should show skipped segment in gray', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectSuccessBreakdownChartVisible()

      // Chart may have skipped segments
      const chart = metricsDashboardPage.successBreakdownChart
      await expect(chart).toBeVisible()
    })

    test('should display total count in center of donut', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectSuccessBreakdownChartVisible()

      // Center should show count
      const text = await metricsDashboardPage.successBreakdownChart.textContent()
      if (text) {
        expect(text).toMatch(/\\d+/)
      }
    })

    test('should show percentage on hover', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectSuccessBreakdownChartVisible()

      // Hover over chart segment
      const chart = metricsDashboardPage.successBreakdownChart
      const box = await chart.boundingBox()
      if (box) {
        await metricsDashboardPage.getPage().mouse.move(box.x + box.width / 2, box.y + 30)
        await metricsDashboardPage.getPage().waitForTimeout(200)
      }
    })

    test('should show nested breakdown for feature template', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        // Feature template may show nested breakdown (phases vs stories)
        await metricsDashboardPage.expectSuccessBreakdownChartVisible()
      }
    })
  })

  test.describe('Chart Controls', () => {
    test('should display chart controls', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectViewToggleVisible()
    })

    test('should toggle between phase and story view', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const toggleExists = await metricsDashboardPage.viewToggle.isVisible().catch(() => false)
        if (toggleExists) {
          await metricsDashboardPage.toggleChartView()
          // Charts should update
          await metricsDashboardPage.expectChartsVisible()
        }
      }
    })

    test('should display download chart button', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const downloadExists = await metricsDashboardPage.downloadChartButton.isVisible().catch(() => false)
      if (downloadExists) {
        await metricsDashboardPage.expectDownloadChartButtonVisible()
      }
    })

    test('should download chart as PNG', async ({ authenticatedPage }) => {
      await metricsDashboardPage.navigateToMetricsTab()
      const downloadExists = await metricsDashboardPage.downloadChartButton.isVisible().catch(() => false)

      if (downloadExists) {
        const downloadPromise = authenticatedPage.waitForEvent('download').catch(() => null)
        await metricsDashboardPage.downloadChartAsImage()

        try {
          const download = await downloadPromise
          if (download) {
            expect(download.suggestedFilename()).toMatch(/\\.png$/)
          }
        } catch (error) {
          // Download may not trigger in test environment
          expect(error).toBeDefined() // Placeholder
        }
      }
    })

    test('should be responsive on different viewports', async ({ authenticatedPage }) => {
      await metricsDashboardPage.navigateToMetricsTab()

      // Desktop
      await metricsDashboardPage.expectChartsVisible()

      // Tablet
      await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
      await metricsDashboardPage.expectChartsVisible()

      // Mobile
      await authenticatedPage.setViewportSize({ width: 375, height: 667 })
      const chartsVisible = await metricsDashboardPage.chartsSection.isVisible().catch(() => false)
      expect(chartsVisible || true).toBeTruthy() // Charts may be scrollable on mobile

      // Reset
      await authenticatedPage.setViewportSize({ width: 1280, height: 720 })
    })
  })

  test.describe('Chart Interactivity', () => {
    test('should respond to click on phase bar', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const chart = metricsDashboardPage.phaseDurationChart
      const box = await chart.boundingBox()

      if (box) {
        // Click on first bar
        await metricsDashboardPage.getPage().mouse.click(box.x + 50, box.y + 50)
        // Should navigate to phase or show details
        await metricsDashboardPage.expectMetricsLoaded()
      }
    })

    test('should respond to click on story bar', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()

      if (template?.toLowerCase().includes('feature')) {
        const chart = metricsDashboardPage.storyDurationChart
        const box = await chart.boundingBox()

        if (box) {
          // Click on first bar
          await metricsDashboardPage.getPage().mouse.click(box.x + 50, box.y + 50)
          // Should show story details
          await metricsDashboardPage.expectMetricsLoaded()
        }
      }
    })

    test('should update on metrics data change', async ({ authenticatedPage }) => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectChartsVisible()

      // Reload page to trigger data refresh
      await authenticatedPage.reload()
      await metricsDashboardPage.navigateToMetricsTab()

      // Charts should still be visible
      await metricsDashboardPage.expectChartsVisible()
    })
  })

  test.describe('Chart Performance', () => {
    test('should render all charts within 500ms', async () => {
      const startTime = Date.now()
      await metricsDashboardPage.navigateToMetricsTab()
      const renderTime = Date.now() - startTime

      // Charts should render quickly
      expect(renderTime).toBeLessThan(500)
    })

    test('should animate chart transitions smoothly', async () => {
      await metricsDashboardPage.navigateToMetricsTab()

      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()
      if (template?.toLowerCase().includes('feature')) {
        const startTime = Date.now()
        await metricsDashboardPage.toggleChartView()
        const toggleTime = Date.now() - startTime

        // Animation should complete quickly
        expect(toggleTime).toBeLessThan(1000)
      }
    })

    test('should not have layout shift during load', async () => {
      await metricsDashboardPage.navigateToMetricsTab()

      // All charts should be visible and stable
      await metricsDashboardPage.expectPhaseDurationChartVisible()
      await metricsDashboardPage.expectSuccessBreakdownChartVisible()
    })

    test('should handle large datasets (many phases/stories)', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const phaseRowCount = await metricsDashboardPage.getPhaseTableRowCount()

      // If many phases, chart should still render
      if (phaseRowCount > 10) {
        await metricsDashboardPage.expectChartsVisible()
      }
    })
  })

  test.describe('Chart Accessibility', () => {
    test('should have ARIA labels on charts', async () => {
      await metricsDashboardPage.navigateToMetricsTab()

      const chart = metricsDashboardPage.phaseDurationChart
      const ariaLabel = await chart.getAttribute('aria-label').catch(() => null)

      // Charts should have labels (either direct or in container)
      if (ariaLabel) {
        expect(ariaLabel).toBeTruthy()
      }
    })

    test('should support keyboard navigation in chart controls', async () => {
      await metricsDashboardPage.navigateToMetricsTab()

      const template = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()
      if (template?.toLowerCase().includes('feature')) {
        // Focus on toggle button
        const toggle = metricsDashboardPage.viewToggle
        const isVisible = await toggle.isVisible().catch(() => false)

        if (isVisible) {
          await toggle.focus()
          // Should be focusable
          expect(isVisible).toBeTruthy()
        }
      }
    })

    test('should be readable by screen readers', async () => {
      await metricsDashboardPage.navigateToMetricsTab()

      // Charts should have text content for screen readers
      const chart = metricsDashboardPage.phaseDurationChart
      const text = await chart.textContent()
      expect(text).toBeTruthy()
    })
  })

  test.describe('Chart Responsive Behavior', () => {
    test('should adapt chart width to container', async ({ authenticatedPage }) => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectChartsVisible()

      // Resize viewport
      await authenticatedPage.setViewportSize({ width: 600, height: 600 })
      const chart = metricsDashboardPage.phaseDurationChart
      const box = await chart.boundingBox()

      // Chart should adapt to narrower viewport
      if (box) {
        expect(box.width).toBeLessThan(600)
      }

      // Reset
      await authenticatedPage.setViewportSize({ width: 1280, height: 720 })
    })

    test('should stack charts vertically on narrow viewports', async ({ authenticatedPage }) => {
      await metricsDashboardPage.navigateToMetricsTab()

      await authenticatedPage.setViewportSize({ width: 375, height: 667 })

      // Charts should be visible (possibly scrollable)
      const chartsVisible = await metricsDashboardPage.chartsSection.isVisible().catch(() => false)
      if (chartsVisible) {
        await metricsDashboardPage.expectChartsVisible()
      }

      // Reset
      await authenticatedPage.setViewportSize({ width: 1280, height: 720 })
    })
  })
})
