import { TEST_TIMEOUTS } from '@config/test.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Page } from '@playwright/test'

/**
 * Story Panel Page Object
 * Handles story detail panel interactions (Feature template only)
 */
export class StoryPanelPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators - Panel Container
  private get storyPanel() {
    return this.page.locator('[data-testid="story-detail-panel"], [class*="panel"], aside').first()
  }

  // Locators - Story Info
  private get storyTitle() {
    return this.storyPanel.locator('h2, h3').first()
  }

  private get storyOrder() {
    return this.storyPanel.locator('text=/story \\d+ of \\d+/i').first()
  }

  private get storyStatus() {
    return this.storyPanel.locator('[data-testid*="status"], [class*="status"], [role="status"]').first()
  }

  // Locators - Story Metadata
  private get storyDescription() {
    return this.storyPanel.locator('[data-testid="story-description"], [class*="description"]').first()
  }

  private get acceptanceCriteria() {
    return this.storyPanel.locator('[data-testid="acceptance-criteria"], [class*="criteria"]').first()
  }

  private get storyDuration() {
    return this.storyPanel.locator('text=/duration|\\d+[msh]/i').first()
  }

  // Locators - Sub-steps Timeline
  private get subStepsSection() {
    return this.storyPanel.locator('[data-testid="sub-steps"], [class*="steps"]').first()
  }

  private get subStepItems() {
    return this.storyPanel.locator('[data-testid*="sub-step"], [class*="step-item"]')
  }

  private getSubStepByName(stepName: string) {
    return this.storyPanel.locator(`text=${stepName}`).locator('..').first()
  }

  private getSubStepStatus(stepName: string) {
    return this.getSubStepByName(stepName).locator('[class*="status"], [data-testid*="status"]').first()
  }

  private get subStepsExpandButton() {
    return this.storyPanel.locator('button', { hasText: /expand|collapse|sub-steps/i }).first()
  }

  // Locators - Artifacts Section
  private get artifactsSection() {
    return this.storyPanel.locator('[data-testid="story-artifacts"], [class*="artifacts"]').first()
  }

  private get artifactsList() {
    return this.artifactsSection.locator('[data-testid*="artifact"], [class*="artifact-item"]')
  }

  private getArtifactByName(fileName: string) {
    return this.artifactsList.locator(`text=${fileName}`).first()
  }

  // Locators - Logs Section
  private get logsSection() {
    return this.storyPanel.locator('[data-testid="story-logs"], [class*="logs"]').first()
  }

  private get logsContent() {
    return this.logsSection.locator('pre, [class*="content"]').first()
  }

  private get logsExpandButton() {
    return this.logsSection.locator('button', { hasText: /expand|collapse/i }).first()
  }

  // Locators - Story Controls
  private get pauseAfterButton() {
    return this.storyPanel.locator('button', { hasText: /pause after|pause/i }).first()
  }

  private get skipButton() {
    return this.storyPanel.locator('button', { hasText: /skip/i }).first()
  }

  private get retryButton() {
    return this.storyPanel.locator('button', { hasText: /retry/i }).first()
  }

  private get controlsContainer() {
    return this.storyPanel.locator('[data-testid="story-controls"], [class*="controls"]').first()
  }

  // Locators - Close Button
  private get closeButton() {
    return this.storyPanel.locator('button[aria-label*="close"], button:has-text("✕")').first()
  }

  // Locators - Metadata Sections
  private get metadataContainer() {
    return this.storyPanel.locator('[data-testid="story-metadata"], [class*="metadata"]').first()
  }

  // Actions - Panel State
  async openStoryPanel(storyId: string): Promise<void> {
    const storyElement = this.page.locator(`[data-testid="story-${storyId}"], text=/story ${storyId}/i`).first()
    await storyElement.click()
    // Wait for panel to slide in
    await this.page.waitForTimeout(500)
  }

  async closePanel(): Promise<void> {
    const button = this.closeButton
    const isVisible = await button.isVisible().catch(() => false)
    if (isVisible) {
      await button.click()
      await this.page.waitForTimeout(300)
    }
  }

  async clickOutsidePanel(): Promise<void> {
    // Click on the area outside the panel (overlay)
    await this.page.locator('body').click({ position: { x: 100, y: 100 } })
    await this.page.waitForTimeout(300)
  }

  // Actions - Story Information
  async getStoryTitle(): Promise<string | null> {
    return await this.storyTitle.textContent()
  }

  async getStoryOrder(): Promise<string | null> {
    return await this.storyOrder.textContent()
  }

  async getStoryStatus(): Promise<string | null> {
    return await this.storyStatus.textContent()
  }

  async getStoryDescription(): Promise<string | null> {
    return await this.storyDescription.textContent()
  }

  async getAcceptanceCriteria(): Promise<string | null> {
    return await this.acceptanceCriteria.textContent()
  }

  async getStoryDuration(): Promise<string | null> {
    return await this.storyDuration.textContent()
  }

  // Actions - Sub-steps
  async expandSubSteps(): Promise<void> {
    const button = this.subStepsExpandButton
    const isVisible = await button.isVisible().catch(() => false)
    if (isVisible) {
      await button.click()
      await this.page.waitForTimeout(300)
    }
  }

  async collapseSubSteps(): Promise<void> {
    const button = this.subStepsExpandButton
    const text = await button.textContent()
    if (text?.includes('collapse')) {
      await button.click()
      await this.page.waitForTimeout(300)
    }
  }

  async getSubStepCount(): Promise<number> {
    return await this.subStepItems.count()
  }

  async getSubStepStatusText(stepName: string): Promise<string | null> {
    return await this.getSubStepStatus(stepName).textContent()
  }

  // Actions - Artifacts
  async getArtifactCount(): Promise<number> {
    return await this.artifactsList.count()
  }

  async clickArtifact(fileName: string): Promise<void> {
    const artifact = this.getArtifactByName(fileName)
    await artifact.click()
  }

  // Actions - Logs
  async expandLogs(): Promise<void> {
    const button = this.logsExpandButton
    const isVisible = await button.isVisible().catch(() => false)
    if (isVisible) {
      await button.click()
      await this.page.waitForTimeout(300)
    }
  }

  async getLogsContent(): Promise<string | null> {
    return await this.logsContent.textContent()
  }

  async scrollLogs(direction: 'up' | 'down'): Promise<void> {
    const logsEl = this.logsContent
    const isVisible = await logsEl.isVisible().catch(() => false)
    if (isVisible) {
      const key = direction === 'up' ? 'ArrowUp' : 'ArrowDown'
      await logsEl.press(key)
    }
  }

  // Actions - Story Controls
  async clickPauseAfter(): Promise<void> {
    await this.pauseAfterButton.click()
  }

  async clickSkip(): Promise<void> {
    await this.skipButton.click()
  }

  async clickRetry(): Promise<void> {
    await this.retryButton.click()
  }

  // Assertions - Panel State
  async expectStoryPanelOpen(): Promise<void> {
    await expect(this.storyPanel).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStoryPanelClosed(): Promise<void> {
    await expect(this.storyPanel).not.toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPanelSlideIn(): Promise<void> {
    // Check that panel is visible and positioned on the right
    await expect(this.storyPanel).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    const boundingBox = await this.storyPanel.boundingBox()
    expect(boundingBox?.x).toBeGreaterThan(800) // Assume panel is on right side
  }

  // Assertions - Story Info
  async expectStoryTitleVisible(): Promise<void> {
    await expect(this.storyTitle).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStoryOrderVisible(): Promise<void> {
    await expect(this.storyOrder).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStoryStatusVisible(): Promise<void> {
    await expect(this.storyStatus).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStoryDescriptionVisible(): Promise<void> {
    await expect(this.storyDescription).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectAcceptanceCriteriaVisible(): Promise<void> {
    await expect(this.acceptanceCriteria).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectMetadataVisible(): Promise<void> {
    await expect(this.metadataContainer).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Sub-steps
  async expectSubStepsVisible(): Promise<void> {
    await expect(this.subStepsSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectSubStepCount(count: number): Promise<void> {
    const actualCount = await this.getSubStepCount()
    expect(actualCount).toBe(count)
  }

  // Assertions - Artifacts
  async expectArtifactsSectionVisible(): Promise<void> {
    await expect(this.artifactsSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectArtifactListNotEmpty(): Promise<void> {
    const count = await this.getArtifactCount()
    expect(count).toBeGreaterThan(0)
  }

  // Assertions - Logs
  async expectLogsSectionVisible(): Promise<void> {
    await expect(this.logsSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectLogsCollapsible(): Promise<void> {
    await expect(this.logsExpandButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Controls
  async expectControlsVisible(): Promise<void> {
    await expect(this.controlsContainer).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPauseAfterButtonVisible(): Promise<void> {
    await expect(this.pauseAfterButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectSkipButtonVisible(): Promise<void> {
    await expect(this.skipButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRetryButtonVisible(): Promise<void> {
    await expect(this.retryButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectCloseButtonVisible(): Promise<void> {
    await expect(this.closeButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }
}
