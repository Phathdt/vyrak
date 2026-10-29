import { TEST_TIMEOUTS } from '@config/test.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Page } from '@playwright/test'

/**
 * Approval Modal Page Object
 * Handles template-aware approval modal interactions (Story 14.2, 14.3)
 */
export class ApprovalModalPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators - Modal Container
  private get modalOverlay() {
    return this.getPage().locator('[role="dialog"], [data-testid*="approval-modal"]').last()
  }

  private get modalHeader() {
    return this.modalOverlay.locator('h1, h2, [data-testid*="modal-title"]').first()
  }

  private get templateBadge() {
    return this.modalOverlay.locator('[data-testid*="template-badge"], text=/feature|hotfix/i').first()
  }

  private get closeButton() {
    return this.modalOverlay.locator('button[aria-label*="Close"], button:has-text("✕")')
  }

  // Locators - Feature Template Artifacts (Story 14.2)
  private get ardSection() {
    return this.modalOverlay.locator('[data-testid*="ard"], text=/architecture requirements|ard/i').first()
  }

  private get ardContent() {
    return this.ardSection.locator('[class*="markdown"], pre, p')
  }

  private get copyArdButton() {
    return this.ardSection.getByRole('button', { name: /copy|copy ard/i })
  }

  private get downloadArdButton() {
    return this.ardSection.getByRole('button', { name: /download|save/i })
  }

  private get storiesSection() {
    return this.modalOverlay.locator('[data-testid*="stories"], text=/stories breakdown/i').first()
  }

  private get storyCards() {
    return this.storiesSection.locator('[data-testid*="story"], [class*="story-card"]')
  }

  private get storyTitle() {
    return this.storyCards.locator('h3, h4, [class*="title"]')
  }

  private get totalStoriesCount() {
    return this.storiesSection.locator('text=/total.*stories|\\d+\\s+stories/i')
  }

  private get totalEstimatedDuration() {
    return this.storiesSection.locator('text=/total.*duration|estimated.*time/i')
  }

  private get expandAllButton() {
    return this.storiesSection.getByRole('button', { name: /expand all/i })
  }

  private get collapseAllButton() {
    return this.storiesSection.getByRole('button', { name: /collapse all/i })
  }

  // Locators - Hotfix Template Artifacts (Story 14.2)
  private get bugAnalysisSection() {
    return this.modalOverlay.locator('[data-testid*="bug-analysis"], text=/bug analysis/i').first()
  }

  private get bugDescription() {
    return this.bugAnalysisSection.locator('[data-testid*="description"], p, div').first()
  }

  private get fixApproachSection() {
    return this.modalOverlay.locator('[data-testid*="fix-approach"], text=/fix approach/i').first()
  }

  private get regressionTestPlan() {
    return this.modalOverlay.locator('[data-testid*="regression"], text=/regression test/i').first()
  }

  // Locators - Code Highlighting
  private get codeBlocks() {
    return this.modalOverlay.locator('pre, [class*="code-block"]')
  }

  private get syntaxHighlightedCode() {
    return this.codeBlocks.locator('[class*="hljs"], [class*="language"]')
  }

  // Locators - Footer Actions
  private get modalFooter() {
    return this.modalOverlay.locator('[class*="footer"], [role="region"]:has-text(/approve|reject/i)')
  }

  private get rejectButton() {
    return this.modalFooter.getByRole('button', { name: /reject/i })
  }

  private get approveButton() {
    return this.modalFooter.getByRole('button', { name: /approve/i })
  }

  private get commentTextarea() {
    return this.modalOverlay.locator('textarea[name*="comment"], [data-testid*="comment"]')
  }

  // Locators - Concurrent Approval Alert
  private get concurrentApprovalAlert() {
    return this.modalOverlay.locator('[role="alert"], text=/already approved|already rejected/i')
  }

  private get concurrentApprovalDetails() {
    return this.concurrentApprovalAlert.locator('text=/by.*at/i')
  }

  // Actions - Modal Navigation
  async close(): Promise<void> {
    await this.closeButton.click({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async pressEscape(): Promise<void> {
    await this.getPage().keyboard.press('Escape')
  }

  // Actions - Feature Template Interactions
  async expandStory(index: number): Promise<void> {
    const story = this.storyCards.nth(index)
    const expandButton = story.locator('button[aria-expanded="false"]').first()
    const isVisible = await expandButton.isVisible().catch(() => false)
    if (isVisible) {
      await expandButton.click()
    }
  }

  async collapseStory(index: number): Promise<void> {
    const story = this.storyCards.nth(index)
    const collapseButton = story.locator('button[aria-expanded="true"]').first()
    const isVisible = await collapseButton.isVisible().catch(() => false)
    if (isVisible) {
      await collapseButton.click()
    }
  }

  async expandAllStories(): Promise<void> {
    const isVisible = await this.expandAllButton.isVisible().catch(() => false)
    if (isVisible) {
      await this.expandAllButton.click()
    }
  }

  async collapseAllStories(): Promise<void> {
    const isVisible = await this.collapseAllButton.isVisible().catch(() => false)
    if (isVisible) {
      await this.collapseAllButton.click()
    }
  }

  async copyArd(): Promise<void> {
    await this.copyArdButton.click({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async downloadArd(): Promise<void> {
    await this.downloadArdButton.click({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Actions - Comments
  async fillComment(comment: string): Promise<void> {
    await this.commentTextarea.fill(comment, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async getCommentValue(): Promise<string> {
    return await this.commentTextarea.inputValue()
  }

  async clearComment(): Promise<void> {
    await this.commentTextarea.clear()
  }

  // Actions - Approval/Rejection
  async clickApprove(): Promise<void> {
    await this.approveButton.click({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async clickReject(): Promise<void> {
    await this.rejectButton.click({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async approveWithComment(comment: string): Promise<void> {
    await this.fillComment(comment)
    await this.clickApprove()
  }

  async rejectWithReason(reason: string): Promise<void> {
    await this.fillComment(reason)
    await this.clickReject()
  }

  // Getters - Information
  async getModalTitle(): Promise<string | null> {
    return await this.modalHeader.textContent()
  }

  async getTemplateName(): Promise<string | null> {
    return await this.templateBadge.textContent()
  }

  async getStoryCount(): Promise<number> {
    return await this.storyCards.count()
  }

  async getStoryTitleByIndex(index: number): Promise<string | null> {
    return await this.storyTitle.nth(index).textContent()
  }

  async getTotalStoriesText(): Promise<string | null> {
    return await this.totalStoriesCount.textContent()
  }

  async getTotalDurationText(): Promise<string | null> {
    return await this.totalEstimatedDuration.textContent()
  }

  async getBugDescription(): Promise<string | null> {
    return await this.bugDescription.textContent()
  }

  // Assertions - Modal State
  async expectModalVisible(): Promise<void> {
    await expect(this.modalOverlay).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectModalClosed(): Promise<void> {
    await expect(this.modalOverlay).not.toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectModalTitle(title: string | RegExp): Promise<void> {
    await expect(this.modalHeader).toContainText(title, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectTemplateBadge(template: 'feature' | 'hotfix'): Promise<void> {
    const templateText = template === 'feature' ? /feature/i : /hotfix/i
    await expect(this.templateBadge).toContainText(templateText, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectCloseButtonVisible(): Promise<void> {
    await expect(this.closeButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Feature Template
  async expectArdVisible(): Promise<void> {
    await expect(this.ardSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectArdHasContent(): Promise<void> {
    const contentCount = await this.ardContent.count()
    expect(contentCount).toBeGreaterThan(0)
  }

  async expectStoriesVisible(): Promise<void> {
    await expect(this.storiesSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStoryCardCount(count: number): Promise<void> {
    const actualCount = await this.getStoryCount()
    expect(actualCount).toBe(count)
  }

  async expectTotalStoriesDisplayed(): Promise<void> {
    await expect(this.totalStoriesCount).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectTotalDurationDisplayed(): Promise<void> {
    await expect(this.totalEstimatedDuration).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Hotfix Template
  async expectBugAnalysisVisible(): Promise<void> {
    await expect(this.bugAnalysisSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectBugDescriptionVisible(): Promise<void> {
    await expect(this.bugDescription).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectFixApproachVisible(): Promise<void> {
    await expect(this.fixApproachSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRegressionTestPlanVisible(): Promise<void> {
    await expect(this.regressionTestPlan).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Code Blocks
  async expectCodeBlocksPresent(): Promise<void> {
    const count = await this.syntaxHighlightedCode.count()
    expect(count).toBeGreaterThan(0)
  }

  // Assertions - Actions
  async expectApproveButtonVisible(): Promise<void> {
    await expect(this.approveButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectApproveButtonEnabled(): Promise<void> {
    await expect(this.approveButton).toBeEnabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRejectButtonVisible(): Promise<void> {
    await expect(this.rejectButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRejectButtonEnabled(): Promise<void> {
    await expect(this.rejectButton).toBeEnabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectCommentFieldVisible(): Promise<void> {
    await expect(this.commentTextarea).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Concurrent Approval
  async expectConcurrentApprovalAlert(): Promise<void> {
    await expect(this.concurrentApprovalAlert).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectConcurrentApprovalDetailsVisible(): Promise<void> {
    await expect(this.concurrentApprovalDetails).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectApproveButtonDisabled(): Promise<void> {
    await expect(this.approveButton).toBeDisabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRejectButtonDisabled(): Promise<void> {
    await expect(this.rejectButton).toBeDisabled({ timeout: TEST_TIMEOUTS.ACTION })
  }
}
