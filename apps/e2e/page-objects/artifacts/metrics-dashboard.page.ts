import { TEST_TIMEOUTS } from '@config/test.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Page } from '@playwright/test'

export class MetricsDashboardPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators - Metrics Tab
  private get metricsTab() {
    return this.getPage().getByRole('tab', { name: /metrics/i })
  }

  private get metricsContainer() {
    return this.getPage().locator('[data-testid*="metrics"], [class*="metrics"]').first()
  }

  // Locators - Overview Cards
  private get overviewCards() {
    return this.getPage().locator('[data-testid*="overview-card"], [class*="overview-card"]')
  }

  private getDurationCard() {
    return this.overviewCards.filter({ hasText: /duration|total duration/i }).first()
  }

  private getPhaseCountCard() {
    return this.overviewCards.filter({ hasText: /phase|phases/i }).first()
  }

  private getSuccessRateCard() {
    return this.overviewCards.filter({ hasText: /success|rate/i }).first()
  }

  private getRetryCountCard() {
    return this.overviewCards.filter({ hasText: /retry|retries/i }).first()
  }

  // Locators - Status & Template Badges
  private get statusBadge() {
    return this.getPage().locator('[data-testid*="status-badge"], text=/succeeded|failed|partially_succeeded/i')
  }

  private get templateBadge() {
    return this.getPage().locator('[data-testid*="template-badge"], text=/feature|hotfix|spike/i')
  }

  // Locators - Phase Metrics Table
  get phaseMetricsTable() {
    return this.getPage().locator('table, [role="table"], [data-testid*="phase-table"]').first()
  }

  get phaseTableRows() {
    return this.phaseMetricsTable.locator('tr, [role="row"]')
  }

  private get phaseTableHeaders() {
    return this.phaseMetricsTable.locator('th, [role="columnheader"]')
  }

  private getPhaseRowByName(phaseName: string) {
    return this.phaseTableRows.filter({ hasText: phaseName }).first()
  }

  get slowestPhaseHighlight() {
    return this.phaseMetricsTable.locator('[class*="slowest"], [class*="amber"]')
  }

  get failedPhaseHighlight() {
    return this.phaseMetricsTable.locator('[class*="failed"], [class*="red"]')
  }

  // Locators - Story Metrics Table (Feature Only)
  get storyMetricsTable() {
    return this.getPage()
      .locator('table, [role="table"]')
      .filter({ hasText: /story|stories/i })
      .first()
  }

  get storyTableRows() {
    return this.storyMetricsTable.locator('tr, [role="row"]')
  }

  getStoryRowByNumber(storyNumber: number) {
    return this.storyTableRows.filter({ hasText: `Story ${storyNumber}` }).first()
  }

  get slowestStoryHighlight() {
    return this.storyMetricsTable.locator('[class*="slowest"]')
  }

  // Locators - Story Summary
  get storySummarySection() {
    return this.getPage().locator('text=/story performance summary|story summary/i').locator('..')
  }

  private getStorySummaryMetric(metricName: string) {
    return this.storySummarySection.locator(`text=/${metricName}/i`)
  }

  // Locators - Bottleneck Detection
  private get bottleneckSection() {
    return this.getPage().locator('text=/performance bottlenecks|bottleneck/i').locator('..')
  }

  private get bottleneckItems() {
    return this.bottleneckSection.locator('[data-testid*="bottleneck"], [class*="bottleneck-item"]')
  }

  private get bottleneckEmptyState() {
    return this.bottleneckSection.locator('text=/no bottlenecks|✅/i')
  }

  // Locators - Retry Patterns
  private get retryPatternsSection() {
    return this.getPage().locator('text=/retry pattern|retry patterns/i').locator('..')
  }

  private get retryPatternItems() {
    return this.retryPatternsSection.locator('[data-testid*="retry-pattern"], [class*="retry-item"]')
  }

  private get retryPatternsEmptyState() {
    return this.retryPatternsSection.locator('text=/no retries|✅/i')
  }

  // Locators - Sort Headers
  get chartsSection() {
    return this.getPage().locator('[data-testid*="charts"], [class*="charts"]')
  }

  get phaseDurationChart() {
    return this.chartsSection.locator('[data-testid*="phase-duration"], svg').first()
  }

  get storyDurationChart() {
    return this.chartsSection.locator('[data-testid*="story-duration"], svg').first()
  }

  get successBreakdownChart() {
    return this.chartsSection.locator('[data-testid*="success"], [data-testid*="breakdown"], svg').first()
  }

  private get chartControls() {
    return this.chartsSection.locator('[data-testid*="chart-controls"]')
  }

  get viewToggle() {
    return this.chartControls.getByRole('button', { name: /phase|story/i }).first()
  }

  get downloadChartButton() {
    return this.chartControls.getByRole('button', { name: /download|export/i })
  }

  // Actions - Tab Navigation
  async clickMetricsTab(): Promise<void> {
    await this.metricsTab.click()
    await this.getPage().waitForTimeout(500)
  }

  async navigateToMetricsTab(): Promise<void> {
    await this.clickMetricsTab()
    await expect(this.metricsContainer).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Actions - Get Overview Metrics
  async getDurationValue(): Promise<string | null> {
    return await this.getDurationCard().textContent()
  }

  async getPhaseCount(): Promise<string | null> {
    return await this.getPhaseCountCard().textContent()
  }

  async getSuccessRate(): Promise<string | null> {
    return await this.getSuccessRateCard().textContent()
  }

  async getRetryCount(): Promise<string | null> {
    return await this.getRetryCountCard().textContent()
  }

  // Actions - Table Interactions
  async sortPhaseTableBy(columnName: string): Promise<void> {
    const headers = this.phaseTableHeaders
    const count = await headers.count()
    for (let i = 0; i < count; i++) {
      const header = headers.nth(i)
      const text = await header.textContent()
      if (text?.includes(columnName)) {
        await header.click()
        await this.getPage().waitForTimeout(300)
        return
      }
    }
  }

  async clickPhaseRow(phaseName: string): Promise<void> {
    const row = this.getPhaseRowByName(phaseName)
    await row.click()
  }

  async sortStoryTableBy(columnName: string): Promise<void> {
    const headers = this.storyMetricsTable.locator('th, [role="columnheader"]')
    const count = await headers.count()
    for (let i = 0; i < count; i++) {
      const header = headers.nth(i)
      const text = await header.textContent()
      if (text?.includes(columnName)) {
        await header.click()
        await this.getPage().waitForTimeout(300)
        return
      }
    }
  }

  async clickStoryRow(storyNumber: number): Promise<void> {
    const row = this.getStoryRowByNumber(storyNumber)
    await row.click()
  }

  // Actions - Chart Interactions
  async toggleChartView(): Promise<void> {
    await this.viewToggle.click()
    await this.getPage().waitForTimeout(500)
  }

  async downloadChartAsImage(): Promise<void> {
    await this.downloadChartButton.click()
  }

  async hoverChartBar(index: number): Promise<void> {
    const chart = this.phaseDurationChart
    // Approximate hover location for bar chart
    const box = await chart.boundingBox()
    if (box) {
      await this.getPage().mouse.move(box.x + 100, box.y + 50 + index * 40)
      await this.getPage().waitForTimeout(200)
    }
  }

  // Actions - Get Information
  async getBottleneckCount(): Promise<number> {
    return await this.bottleneckItems.count()
  }

  async getBottleneckTexts(): Promise<string[]> {
    return await this.bottleneckItems.allTextContents()
  }

  async getRetryPatternCount(): Promise<number> {
    return await this.retryPatternItems.count()
  }

  async getRetryPatternTexts(): Promise<string[]> {
    return await this.retryPatternItems.allTextContents()
  }

  async getPhaseTableRowCount(): Promise<number> {
    return await this.phaseTableRows.count()
  }

  async getStoryTableRowCount(): Promise<number> {
    return await this.storyTableRows.count()
  }

  // Assertions - Tab & Container
  async expectMetricsTabVisible(): Promise<void> {
    await expect(this.metricsTab).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectMetricsLoaded(): Promise<void> {
    await expect(this.metricsContainer).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Overview Cards
  async expectOverviewCardsVisible(): Promise<void> {
    await expect(this.overviewCards.first()).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectDurationCardVisible(): Promise<void> {
    await expect(this.getDurationCard()).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPhaseCountCardVisible(): Promise<void> {
    await expect(this.getPhaseCountCard()).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStatusBadgeVisible(status?: string): Promise<void> {
    const badge = this.statusBadge
    await expect(badge).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    if (status) {
      await expect(badge).toContainText(status)
    }
  }

  async expectTemplateBadgeVisible(template?: string): Promise<void> {
    const badge = this.templateBadge
    await expect(badge).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    if (template) {
      await expect(badge).toContainText(template)
    }
  }

  // Assertions - Phase Metrics Table
  async expectPhaseMetricsTableVisible(): Promise<void> {
    await expect(this.phaseMetricsTable).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPhaseRowVisible(phaseName: string): Promise<void> {
    await expect(this.getPhaseRowByName(phaseName)).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPhaseRowCount(count: number): Promise<void> {
    const actual = await this.getPhaseTableRowCount()
    expect(actual).toBe(count)
  }

  async expectSlowestPhaseHighlighted(): Promise<void> {
    await expect(this.slowestPhaseHighlight).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectFailedPhaseHighlighted(): Promise<void> {
    await expect(this.failedPhaseHighlight).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Story Metrics Table (Feature Only)
  async expectStoryMetricsTableVisible(): Promise<void> {
    await expect(this.storyMetricsTable).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStoryRowVisible(storyNumber: number): Promise<void> {
    await expect(this.getStoryRowByNumber(storyNumber)).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStoryRowCount(count: number): Promise<void> {
    const actual = await this.getStoryTableRowCount()
    expect(actual).toBe(count)
  }

  async expectSlowestStoryHighlighted(): Promise<void> {
    await expect(this.slowestStoryHighlight).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Story Summary
  async expectStorySummaryVisible(): Promise<void> {
    await expect(this.storySummarySection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStorySummaryMetricVisible(metricName: string): Promise<void> {
    await expect(this.getStorySummaryMetric(metricName)).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Bottleneck Detection
  async expectBottleneckSectionVisible(): Promise<void> {
    await expect(this.bottleneckSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectBottlenecksDetected(): Promise<void> {
    const count = await this.getBottleneckCount()
    expect(count).toBeGreaterThan(0)
  }

  async expectNoBottlenecks(): Promise<void> {
    await expect(this.bottleneckEmptyState).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Retry Patterns
  async expectRetryPatternsSectionVisible(): Promise<void> {
    await expect(this.retryPatternsSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRetryPatternsDetected(): Promise<void> {
    const count = await this.getRetryPatternCount()
    expect(count).toBeGreaterThan(0)
  }

  async expectNoRetryPatterns(): Promise<void> {
    await expect(this.retryPatternsEmptyState).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Charts
  async expectChartsVisible(): Promise<void> {
    await expect(this.chartsSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPhaseDurationChartVisible(): Promise<void> {
    await expect(this.phaseDurationChart).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStoryDurationChartVisible(): Promise<void> {
    await expect(this.storyDurationChart).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectSuccessBreakdownChartVisible(): Promise<void> {
    await expect(this.successBreakdownChart).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectViewToggleVisible(): Promise<void> {
    await expect(this.viewToggle).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectDownloadChartButtonVisible(): Promise<void> {
    await expect(this.downloadChartButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }
}
