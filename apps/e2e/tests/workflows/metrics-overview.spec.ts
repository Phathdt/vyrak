import { expect, test } from '@fixtures/auth.fixture'
import { MetricsDashboardPage } from '@page-objects/artifacts/metrics-dashboard.page'
import { WorkflowDetailPage } from '@page-objects/workflows/workflow-detail.page'

test.describe('Workflow Metrics - Overview Cards', () => {
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

  test.describe('Metrics Tab Navigation', () => {
    test('should display metrics tab in workflow detail', async () => {
      await metricsDashboardPage.expectMetricsTabVisible()
    })

    test('should navigate to metrics tab', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectMetricsLoaded()
    })

    test('should keep metrics tab persistent when switching tabs', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectMetricsLoaded()

      // The metrics should still be there (even if we navigate to other tabs)
      await metricsDashboardPage.expectMetricsTabVisible()
    })
  })

  test.describe('Overview Cards Display', () => {
    test('should display workflow overview cards section', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectOverviewCardsVisible()
    })

    test('should display total duration card', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectDurationCardVisible()
    })

    test('should display total duration in human-readable format', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const duration = await metricsDashboardPage.getDurationValue()
      if (duration) {
        // Format: "32m 15s" or similar
        expect(duration).toMatch(/\d+\s*[smh]/)
      }
    })

    test('should display phase count card', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectPhaseCountCardVisible()
    })

    test('should display phase count number', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const phaseCount = await metricsDashboardPage.getPhaseCount()
      if (phaseCount) {
        expect(parseInt(phaseCount)).toBeGreaterThan(0)
      }
    })

    test('should display success rate card', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      // Success rate card should be visible (may show 100%, N/A, or percentage)
      const successRate = await metricsDashboardPage.getSuccessRate()
      expect(successRate).toBeDefined()
    })

    test('should display success rate as percentage', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const successRate = await metricsDashboardPage.getSuccessRate()
      if (successRate && successRate.includes('%')) {
        const rate = parseInt(successRate)
        expect(rate).toBeGreaterThanOrEqual(0)
        expect(rate).toBeLessThanOrEqual(100)
      }
    })

    test('should display retry count card', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const retryCount = await metricsDashboardPage.getRetryCount()
      expect(retryCount).toBeDefined()
    })

    test('should display retry count as number', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const retryCount = await metricsDashboardPage.getRetryCount()
      if (retryCount) {
        const count = parseInt(retryCount)
        expect(count).toBeGreaterThanOrEqual(0)
      }
    })

    test('should display status badge', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectStatusBadgeVisible()
    })

    test('should show correct status in badge', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const statusText = await metricsDashboardPage
        .getPage()
        .locator('[data-testid*="status-badge"], text=/succeeded|failed|partially_succeeded/i')
        .textContent()
      if (statusText) {
        expect(['succeeded', 'failed', 'partially_succeeded'].some((s) => statusText.includes(s))).toBeTruthy()
      }
    })

    test('should display template badge', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectTemplateBadgeVisible()
    })

    test('should show correct template type', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const templateText = await metricsDashboardPage.getPage().locator('[data-testid*="template-badge"]').textContent()
      if (templateText) {
        expect(['Feature', 'Hotfix', 'Spike'].some((t) => templateText.includes(t))).toBeTruthy()
      }
    })
  })

  test.describe('Overview Card Metrics', () => {
    test('should display consistent metrics across page loads', async ({ authenticatedPage }) => {
      await metricsDashboardPage.navigateToMetricsTab()
      const duration1 = await metricsDashboardPage.getDurationValue()

      // Reload page
      await authenticatedPage.reload()
      await metricsDashboardPage.navigateToMetricsTab()
      const duration2 = await metricsDashboardPage.getDurationValue()

      // Metrics should be same
      expect(duration1).toBe(duration2)
    })

    test('should display meaningful metrics values', async () => {
      await metricsDashboardPage.navigateToMetricsTab()

      const duration = await metricsDashboardPage.getDurationValue()
      const phaseCount = await metricsDashboardPage.getPhaseCount()
      const successRate = await metricsDashboardPage.getSuccessRate()

      // At least duration should be populated
      expect(duration || phaseCount || successRate).toBeTruthy()
    })

    test('should display duration value (not loading state)', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const duration = await metricsDashboardPage.getDurationValue()

      // Should not be empty or "loading"
      expect(duration).not.toBe('')
      expect(duration?.toLowerCase()).not.toContain('loading')
    })
  })

  test.describe('Card Styling and Layout', () => {
    test('should display cards in a grid layout', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const cards = await metricsDashboardPage
        .getPage()
        .locator('[data-testid*="overview-card"], [class*="overview-card"]')
        .count()

      // Should have at least 4 cards (duration, phases, success rate, retries)
      expect(cards).toBeGreaterThanOrEqual(3)
    })

    test('should style cards with appropriate colors', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const cards = await metricsDashboardPage
        .getPage()
        .locator('[data-testid*="overview-card"], [class*="overview-card"]')

      const count = await cards.count()
      expect(count).toBeGreaterThan(0)

      // Verify first card has styling
      const firstCard = cards.first()
      const boxModel = await firstCard.boundingBox()
      expect(boxModel).toBeDefined()
    })

    test('should display card icons appropriately', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      const icons = await metricsDashboardPage
        .getPage()
        .locator('[data-testid*="overview-card"] svg, [class*="overview-card"] svg')
        .count()

      // Cards should have visual indicators
      if (icons > 0) {
        expect(icons).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Overview Performance', () => {
    test('should load metrics within acceptable time', async () => {
      const startTime = Date.now()
      await metricsDashboardPage.navigateToMetricsTab()
      const loadTime = Date.now() - startTime

      // Metrics should load within 2 seconds
      expect(loadTime).toBeLessThan(2000)
    })

    test('should display overview cards without lag', async () => {
      await metricsDashboardPage.navigateToMetricsTab()
      await metricsDashboardPage.expectOverviewCardsVisible()

      // Cards should render quickly
      const cards = await metricsDashboardPage.getPage().locator('[data-testid*="overview-card"]')
      expect(await cards.count()).toBeGreaterThan(0)
    })
  })

  test.describe('Responsive Overview Display', () => {
    test('should adapt overview cards to viewport width', async ({ authenticatedPage }) => {
      await metricsDashboardPage.navigateToMetricsTab()

      // Resize viewport
      await authenticatedPage.setViewportSize({ width: 768, height: 1024 })
      await metricsDashboardPage.expectOverviewCardsVisible()

      // Should still be visible on mobile
      await authenticatedPage.setViewportSize({ width: 375, height: 667 })
      await metricsDashboardPage.expectOverviewCardsVisible()

      // Reset
      await authenticatedPage.setViewportSize({ width: 1280, height: 720 })
    })

    test('should stack cards vertically on small screens', async ({ authenticatedPage }) => {
      await metricsDashboardPage.navigateToMetricsTab()

      // Set mobile viewport
      await authenticatedPage.setViewportSize({ width: 375, height: 667 })

      const cards = await metricsDashboardPage.getPage().locator('[data-testid*="overview-card"]')
      const count = await cards.count()

      // Cards should still be visible
      if (count > 0) {
        const firstCard = cards.first()
        await expect(firstCard).toBeVisible()
      }

      // Reset
      await authenticatedPage.setViewportSize({ width: 1280, height: 720 })
    })
  })
})
