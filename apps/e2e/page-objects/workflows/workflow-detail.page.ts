import { TEST_TIMEOUTS } from '@config/test.config'
import { URLS } from '@config/urls.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Page } from '@playwright/test'

export class WorkflowDetailPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators - Header
  private get workflowTitle() {
    return this.getPage().locator('h1', { hasText: /workflow|run/i })
  }

  private get statusBadge() {
    return this.getPage().locator('[data-testid*="status"], [class*="badge"], [role="status"]').first()
  }

  private get connectionIndicator() {
    return this.getPage().locator('text=/live|connected|disconnected|reconnecting/i')
  }

  // Locators - Cancel Button
  private get cancelWorkflowButton() {
    return this.getPage().getByRole('button', { name: /cancel workflow|cancel/i })
  }

  // Locators - Overview Section
  private get workflowKeyBadge() {
    return this.getPage().locator('[class*="font-mono"], [data-testid*="workflow-key"]').first()
  }

  // Locators - Progress Section
  private get progressBar() {
    return this.getPage().locator('[role="progressbar"], [data-testid*="progress"], [class*="progress"]').first()
  }

  private get progressText() {
    return this.getPage().locator('text=/completed.*steps|progress/i')
  }

  // Locators - Step Timeline
  private get stepTimelineSection() {
    return this.getPage().locator('section', { has: this.getPage().locator('text=/step|timeline/i') })
  }

  private get stepCards() {
    return this.stepTimelineSection.locator('[data-testid*="step"], [class*="step"], [role="button"]')
  }

  private getStepCardByName(stepName: string) {
    return this.getPage().locator(`text=${stepName}`).locator('..')
  }

  private get stepTimelineInitializing() {
    return this.getPage().locator('text=/no steps yet|initializing/i')
  }

  // Locators - Step Details Panel
  private get stepDetailsPanel() {
    return this.getPage().locator('[role="dialog"], [class*="panel"], aside').first()
  }

  private get stepDetailsPanelTitle() {
    return this.stepDetailsPanel.locator('h2, h3').first()
  }

  private get stepDetailsCloseButton() {
    return this.stepDetailsPanel
      .locator('button[aria-label*="Close"], button:has-text("✕"), button[aria-label*="close"]')
      .first()
  }

  private get stepOutputSection() {
    return this.stepDetailsPanel.locator('text=/output|result/i')
  }

  private get stepErrorSection() {
    return this.stepDetailsPanel.locator('[class*="error"], text=/error details/i')
  }

  private get jsonViewer() {
    return this.stepDetailsPanel.locator('[data-testid*="json"], [class*="json"], pre').first()
  }

  // Locators - Cancel Modal
  private get cancelModal() {
    return this.getPage().locator('[role="dialog"]').last()
  }

  private get cancelModalTitle() {
    return this.cancelModal.locator('text=/cancel workflow/i')
  }

  private get cancelReasonTextarea() {
    return this.cancelModal.locator('textarea, [data-testid*="reason"]')
  }

  private get acknowledgeCheckbox() {
    return this.cancelModal.locator('input[type="checkbox"]')
  }

  private get confirmCancelButton() {
    return this.cancelModal.getByRole('button', { name: /confirm|cancel|proceed/i })
  }

  private get cancelModalBackButton() {
    return this.cancelModal.getByRole('button', { name: /go back|back|close/i })
  }

  private get cancelModalError() {
    return this.cancelModal.locator('[role="alert"]')
  }

  // Locators - Toasts
  private get toastContainer() {
    return this.getPage().locator('[role="region"][aria-live], [class*="toast"], [data-testid*="toast"]').first()
  }

  private get successToast() {
    return this.toastContainer.locator('text=/succeeded|completed|success/i')
  }

  private get errorToast() {
    return this.toastContainer.locator('text=/failed|error/i')
  }

  // Locators - Loading & Error States
  private get loadingSpinner() {
    return this.getPage().locator('[role="status"], svg[class*="spin"], [class*="loader"]')
  }

  private get errorMessage() {
    return this.getPage().locator('[role="alert"]').first()
  }

  private get notFoundMessage() {
    return this.getPage().locator('text=/workflow not found|invalid workflow|not found/i')
  }

  // Actions - Navigation
  async navigate(runId: string): Promise<void> {
    await this.goto(`${URLS.BASE}/workflows/${runId}`)
  }

  // Actions - Cancel Workflow
  async clickCancelWorkflow(): Promise<void> {
    await this.cancelWorkflowButton.click()
  }

  async fillCancelReason(reason: string): Promise<void> {
    await this.cancelReasonTextarea.fill(reason)
  }

  async acknowledgeCancellation(): Promise<void> {
    await this.acknowledgeCheckbox.click()
  }

  async confirmCancel(): Promise<void> {
    await this.confirmCancelButton.click()
    // Wait for cancel operation
    await this.getPage().waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.API_CALL })
  }

  async cancelModalGoBack(): Promise<void> {
    await this.cancelModalBackButton.click()
  }

  // Actions - Step Interactions
  async clickStep(stepIndex: number): Promise<void> {
    const step = this.stepCards.nth(stepIndex)
    await step.click()
  }

  async clickStepByName(stepName: string): Promise<void> {
    await this.getStepCardByName(stepName).click()
  }

  async closeStepDetails(): Promise<void> {
    await this.stepDetailsCloseButton.click()
  }

  async getStepCount(): Promise<number> {
    return await this.stepCards.count()
  }

  // Actions - Get Information
  async getCurrentStatus(): Promise<string | null> {
    return await this.statusBadge.textContent()
  }

  async getWorkflowKey(): Promise<string | null> {
    return await this.workflowKeyBadge.textContent()
  }

  async getProgressText(): Promise<string | null> {
    return await this.progressText.textContent()
  }

  async getStepDetailsTitle(): Promise<string | null> {
    return await this.stepDetailsPanelTitle.textContent()
  }

  // Assertions - Page State
  async expectOnDetailPage(): Promise<void> {
    await this.expectUrlToMatch(/\/workflows\/\w+/)
    await expect(this.workflowTitle).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPageLoaded(): Promise<void> {
    // Just give the page a moment to settle
    // Don't wait for network idle as it can hang on SSE connections
    await this.getPage().waitForTimeout(500)
  }

  async expectStatusVisible(): Promise<void> {
    await expect(this.statusBadge).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStatusToBe(status: string | RegExp): Promise<void> {
    await expect(this.statusBadge).toContainText(status, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectConnectionIndicatorVisible(): Promise<void> {
    await expect(this.connectionIndicator).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectConnectionState(state: 'connected' | 'connecting' | 'reconnecting' | 'disconnected'): Promise<void> {
    const stateText = state === 'connected' ? 'Live' : state.charAt(0).toUpperCase() + state.slice(1)
    await expect(this.connectionIndicator).toContainText(stateText, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectCancelButtonVisible(): Promise<void> {
    await expect(this.cancelWorkflowButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectCancelButtonDisabled(): Promise<void> {
    await expect(this.cancelWorkflowButton).toBeDisabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectProgressBarVisible(): Promise<void> {
    await expect(this.progressBar).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectProgressText(text: string | RegExp): Promise<void> {
    await expect(this.progressText).toContainText(text, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStepsPresent(): Promise<void> {
    const count = await this.getStepCount()
    expect(count).toBeGreaterThan(0)
  }

  async expectStepCount(count: number): Promise<void> {
    const actualCount = await this.getStepCount()
    expect(actualCount).toBe(count)
  }

  async expectStepInitializing(): Promise<void> {
    await expect(this.stepTimelineInitializing).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStepDetailsOpen(): Promise<void> {
    await expect(this.stepDetailsPanel).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStepDetailsClosed(): Promise<void> {
    await expect(this.stepDetailsPanel).not.toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStepDetailsTitle(title: string | RegExp): Promise<void> {
    await expect(this.stepDetailsPanelTitle).toContainText(title, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStepOutputVisible(): Promise<void> {
    await expect(this.stepOutputSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStepErrorVisible(): Promise<void> {
    await expect(this.stepErrorSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectJsonViewerVisible(): Promise<void> {
    await expect(this.jsonViewer).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectCancelModalOpen(): Promise<void> {
    await expect(this.cancelModal).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    await expect(this.cancelModalTitle).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectCancelReasonFieldVisible(): Promise<void> {
    await expect(this.cancelReasonTextarea).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectAcknowledgeCheckboxVisible(): Promise<void> {
    await expect(this.acknowledgeCheckbox).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectConfirmCancelDisabled(): Promise<void> {
    await expect(this.confirmCancelButton).toBeDisabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectConfirmCancelEnabled(): Promise<void> {
    await expect(this.confirmCancelButton).toBeEnabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectCancelModalErrorVisible(message?: string | RegExp): Promise<void> {
    await expect(this.cancelModalError).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    if (message) {
      await expect(this.cancelModalError).toContainText(message)
    }
  }

  async expectSuccessToastVisible(message?: string | RegExp): Promise<void> {
    await expect(this.successToast).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    if (message) {
      await expect(this.successToast).toContainText(message)
    }
  }

  async expectErrorToastVisible(message?: string | RegExp): Promise<void> {
    await expect(this.errorToast).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    if (message) {
      await expect(this.errorToast).toContainText(message)
    }
  }

  async expectLoadingVisible(): Promise<void> {
    await expect(this.loadingSpinner).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectErrorMessageVisible(message?: string | RegExp): Promise<void> {
    await expect(this.errorMessage).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    if (message) {
      await expect(this.errorMessage).toContainText(message)
    }
  }

  async expectNotFound(): Promise<void> {
    await expect(this.notFoundMessage).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }
}
