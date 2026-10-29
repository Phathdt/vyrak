import { TEST_TIMEOUTS } from '@config/test.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Workflow Controls Page Object
 * Handles workflow action buttons and confirmation modals
 */
export class WorkflowControlsPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators - Primary Action Buttons
  private get cancelButton() {
    return this.page.locator('button', { hasText: /cancel workflow|cancel/i }).first()
  }

  private get pauseButton() {
    return this.page.locator('button', { hasText: /pause workflow|pause/i }).first()
  }

  private get resumeButton() {
    return this.page.locator('button', { hasText: /resume workflow|resume/i }).first()
  }

  private get retryButton() {
    return this.page.locator('button', { hasText: /retry workflow|retry/i }).first()
  }

  private get skipButton() {
    return this.page.locator('button', { hasText: /skip/i }).first()
  }

  // Locators - Dropdown Menu
  private get actionMenuButton() {
    return this.page.locator('[data-testid="workflow-actions-menu"], button[aria-label*="menu"]').first()
  }

  // Locators - Confirmation Modals
  private get confirmationModal() {
    return this.page.locator('[role="dialog"]').last()
  }

  private get modalTitle() {
    return this.confirmationModal.locator('h2, h3').first()
  }

  private get modalDescription() {
    return this.confirmationModal.locator('[data-testid="modal-description"], p').first()
  }

  private get confirmButton() {
    return this.confirmationModal.locator('button', { hasText: /confirm|proceed|yes/i }).first()
  }

  private get cancelModalButton() {
    return this.confirmationModal.locator('button', { hasText: /cancel|go back|no/i }).first()
  }

  // Locators - Cancel Modal Specific
  private get cancelReasonTextarea() {
    return this.confirmationModal.locator('textarea, [data-testid*="reason"]')
  }

  private get acknowledgeCheckbox() {
    return this.confirmationModal.locator('input[type="checkbox"]')
  }

  // Locators - Retry Modal Specific
  private get retryOptionRetryFailed() {
    return this.confirmationModal.locator('label', { hasText: /retry failed|failed only/i })
  }

  private get retryOptionRetryPhase() {
    return this.confirmationModal.locator('label', { hasText: /retry phase|current phase/i })
  }

  private get retryOptionRestartAll() {
    return this.confirmationModal.locator('label', { hasText: /restart all|from beginning/i })
  }

  // Locators - Skip Modal Specific
  private get skipConfirmationText() {
    return this.confirmationModal.locator('text=/skip.*story|skip.*step/i')
  }

  // Locators - Toast Notifications
  private get toastContainer() {
    return this.page.locator('[role="region"][aria-live], [class*="toast"]').first()
  }

  private get successToast() {
    return this.toastContainer.locator('text=/succeeded|completed|success/i')
  }

  private get errorToast() {
    return this.toastContainer.locator('text=/failed|error/i')
  }

  // Locators - Loading State
  private get modalLoadingSpinner() {
    return this.confirmationModal.locator('[role="status"], svg[class*="spin"]')
  }

  // Locators - Modal Error
  private get modalError() {
    return this.confirmationModal.locator('[role="alert"]')
  }

  // Actions - Button Clicks
  async clickCancel(): Promise<void> {
    await this.cancelButton.click()
  }

  async clickPause(): Promise<void> {
    await this.pauseButton.click()
  }

  async clickResume(): Promise<void> {
    await this.resumeButton.click()
  }

  async clickRetry(): Promise<void> {
    await this.retryButton.click()
  }

  async clickSkip(): Promise<void> {
    await this.skipButton.click()
  }

  async openActionMenu(): Promise<void> {
    await this.actionMenuButton.click()
  }

  async clickMenuAction(actionName: string): Promise<void> {
    await this.page.locator(`[role="menuitem"]:has-text("${actionName}")`).click()
  }

  // Actions - Confirmation Modal
  async confirmAction(): Promise<void> {
    await this.confirmButton.click()
    // Wait for action to complete
    await this.page.waitForTimeout(500)
  }

  async cancelAction(): Promise<void> {
    await this.cancelModalButton.click()
  }

  async fillCancelReason(reason: string): Promise<void> {
    await this.cancelReasonTextarea.fill(reason)
  }

  async acknowledgeCancelation(): Promise<void> {
    await this.acknowledgeCheckbox.click()
  }

  // Actions - Retry Options
  async selectRetryOption(option: 'failed' | 'phase' | 'all'): Promise<void> {
    const optionMap = {
      failed: this.retryOptionRetryFailed,
      phase: this.retryOptionRetryPhase,
      all: this.retryOptionRestartAll,
    }
    const label = optionMap[option]
    await label.click()
  }

  // Actions - Get Info
  async getModalTitle(): Promise<string | null> {
    return await this.modalTitle.textContent()
  }

  async getModalDescription(): Promise<string | null> {
    return await this.modalDescription.textContent()
  }

  async isConfirmButtonDisabled(): Promise<boolean> {
    return await this.confirmButton.isDisabled()
  }

  // Assertions - Button Visibility
  async expectCancelButtonVisible(): Promise<void> {
    await expect(this.cancelButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectCancelButtonDisabled(): Promise<void> {
    await expect(this.cancelButton).toBeDisabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectCancelButtonEnabled(): Promise<void> {
    await expect(this.cancelButton).toBeEnabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPauseButtonVisible(): Promise<void> {
    await expect(this.pauseButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectResumeButtonVisible(): Promise<void> {
    await expect(this.resumeButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRetryButtonVisible(): Promise<void> {
    await expect(this.retryButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectSkipButtonVisible(): Promise<void> {
    await expect(this.skipButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Modal State
  async expectConfirmationModalOpen(): Promise<void> {
    await expect(this.confirmationModal).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectConfirmationModalClosed(): Promise<void> {
    await expect(this.confirmationModal).not.toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectModalTitleContains(text: string | RegExp): Promise<void> {
    await expect(this.modalTitle).toContainText(text, { timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Cancel Modal Specific
  async expectCancelReasonFieldVisible(): Promise<void> {
    await expect(this.cancelReasonTextarea).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectAcknowledgeCheckboxVisible(): Promise<void> {
    await expect(this.acknowledgeCheckbox).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectAcknowledgeCheckboxUnchecked(): Promise<void> {
    await expect(this.acknowledgeCheckbox).not.toBeChecked({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectAcknowledgeCheckboxChecked(): Promise<void> {
    await expect(this.acknowledgeCheckbox).toBeChecked({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Confirmation Button
  async expectConfirmButtonDisabled(): Promise<void> {
    await expect(this.confirmButton).toBeDisabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectConfirmButtonEnabled(): Promise<void> {
    await expect(this.confirmButton).toBeEnabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectConfirmButtonContains(text: string | RegExp): Promise<void> {
    await expect(this.confirmButton).toContainText(text, { timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Retry Modal Specific
  async expectRetryOptionRetryFailedVisible(): Promise<void> {
    await expect(this.retryOptionRetryFailed).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRetryOptionRetryPhaseVisible(): Promise<void> {
    await expect(this.retryOptionRetryPhase).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRetryOptionRestartAllVisible(): Promise<void> {
    await expect(this.retryOptionRestartAll).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Skip Modal
  async expectSkipConfirmationTextVisible(): Promise<void> {
    await expect(this.skipConfirmationText).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Toasts
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

  // Assertions - Loading State
  async expectModalLoading(): Promise<void> {
    await expect(this.modalLoadingSpinner).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectModalErrorVisible(message?: string | RegExp): Promise<void> {
    await expect(this.modalError).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    if (message) {
      await expect(this.modalError).toContainText(message)
    }
  }

  // Assertions - Optimistic Updates
  async expectUIUpdatedOptimistically(element: Locator): Promise<void> {
    // UI should update immediately before API completes
    await expect(element).toBeVisible({ timeout: TEST_TIMEOUTS.QUICK_CHECK })
  }
}
