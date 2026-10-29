import { TEST_TIMEOUTS } from '@config/test.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Page } from '@playwright/test'

export class RepositoryFormPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators
  private get addRepositoryModal() {
    return this.page.locator('[data-testid="add-repository-modal"]')
  }

  private get editRepositoryModal() {
    return this.page.locator('[data-testid="edit-repository-modal"]')
  }

  private get removeRepositoryModal() {
    return this.page.locator('[data-testid="remove-repository-modal"]')
  }

  private get statusToggleConfirmModal() {
    return this.page.locator('[data-testid="status-toggle-confirm-modal"]')
  }

  private get repositoryNameInput() {
    return this.page.getByLabel(/repository name/i)
  }

  private get gitUrlInput() {
    return this.page.getByLabel(/git url|repository url/i)
  }

  private get defaultBranchInput() {
    return this.page.getByLabel(/default branch/i)
  }

  private get providerSelect() {
    return this.page.getByLabel(/provider/i)
  }

  private get accessTokenInput() {
    return this.page.getByLabel(/access token/i)
  }

  private get tokenVisibilityToggle() {
    return this.page.locator('[data-testid="token-visibility-toggle"]')
  }

  private get testConnectionButton() {
    return this.page.locator('[data-testid="test-connection-button"]')
  }

  private get saveButton() {
    return this.page
      .locator('[data-testid="form-save-button"]')
      .or(this.page.getByRole('button', { name: /save|create/i }))
  }

  private get cancelButton() {
    return this.page.getByRole('button', { name: /cancel/i })
  }

  private get deleteConfirmInput() {
    return this.page.locator('[data-testid="delete-confirm-input"]')
  }

  private get deleteConfirmButton() {
    return this.page.locator('[data-testid="delete-confirm-button"]')
  }

  private get statusToggleSwitch() {
    return this.page.locator('[data-testid="repository-status-toggle"]')
  }

  private get statusToggleConfirmButton() {
    return this.page.locator('[data-testid="status-toggle-confirm-button"]')
  }

  private get gitUrlReadOnlyField() {
    return this.page.locator('[data-testid="git-url-readonly"]')
  }

  private get gitUrlCopyButton() {
    return this.page.locator('[data-testid="git-url-copy-button"]')
  }

  // Form validation messages
  private get nameErrorMessage() {
    return this.page.locator('[data-testid="name-error-message"]')
  }

  private get urlErrorMessage() {
    return this.page.locator('[data-testid="url-error-message"]')
  }

  private get branchErrorMessage() {
    return this.page.locator('[data-testid="branch-error-message"]')
  }

  // Test connection feedback
  private get testConnectionSpinner() {
    return this.page.locator('[data-testid="test-connection-spinner"]')
  }

  private get testConnectionSuccess() {
    return this.page.locator('[data-testid="test-connection-success"]')
  }

  private get testConnectionError() {
    return this.page.locator('[data-testid="test-connection-error"]')
  }

  // Actions - Form filling
  async fillRepositoryName(name: string): Promise<void> {
    await this.repositoryNameInput.fill(name)
  }

  async fillGitUrl(url: string): Promise<void> {
    await this.gitUrlInput.fill(url)
  }

  async fillDefaultBranch(branch: string): Promise<void> {
    await this.defaultBranchInput.fill(branch)
  }

  async selectProvider(provider: 'github' | 'gitlab' | 'bitbucket'): Promise<void> {
    await this.providerSelect.selectOption(provider)
  }

  async fillAccessToken(token: string): Promise<void> {
    await this.accessTokenInput.fill(token)
  }

  async clearAccessToken(): Promise<void> {
    await this.accessTokenInput.clear()
  }

  async toggleTokenVisibility(): Promise<void> {
    await this.tokenVisibilityToggle.click()
  }

  async clickTestConnection(): Promise<void> {
    await this.testConnectionButton.click()
  }

  async clickSave(): Promise<void> {
    await this.saveButton.click()
  }

  async clickCancel(): Promise<void> {
    await this.cancelButton.click()
  }

  async fillAddRepositoryForm(data: {
    name: string
    url: string
    branch: string
    provider?: 'github' | 'gitlab' | 'bitbucket'
    token?: string
  }): Promise<void> {
    await this.fillRepositoryName(data.name)
    await this.fillGitUrl(data.url)
    await this.fillDefaultBranch(data.branch)
    if (data.provider) {
      await this.selectProvider(data.provider)
    }
    if (data.token) {
      await this.fillAccessToken(data.token)
    }
  }

  // Remove repository actions
  async fillDeleteConfirmation(text: string): Promise<void> {
    await this.deleteConfirmInput.fill(text)
  }

  async clickDeleteConfirm(): Promise<void> {
    await this.deleteConfirmButton.click()
  }

  async getDeleteConfirmButtonDisabledState(): Promise<boolean> {
    return this.deleteConfirmButton.isDisabled()
  }

  // Status toggle actions
  async clickStatusToggle(): Promise<void> {
    await this.statusToggleSwitch.click()
  }

  async confirmStatusToggle(): Promise<void> {
    await this.statusToggleConfirmButton.click()
  }

  async getStatusToggleConfirmText(): Promise<string | null> {
    return this.statusToggleConfirmModal.textContent()
  }

  // Edit-specific actions
  async getGitUrlReadOnly(): Promise<string | null> {
    return this.gitUrlReadOnlyField.textContent()
  }

  async copyGitUrl(): Promise<void> {
    await this.gitUrlCopyButton.click()
  }

  // Modal interactions
  async closeModalWithEscape(): Promise<void> {
    await this.page.keyboard.press('Escape')
  }

  async waitForAddModalVisible(): Promise<void> {
    await expect(this.addRepositoryModal).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async waitForEditModalVisible(): Promise<void> {
    await expect(this.editRepositoryModal).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async waitForRemoveModalVisible(): Promise<void> {
    await expect(this.removeRepositoryModal).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async waitForStatusToggleConfirmModalVisible(): Promise<void> {
    await expect(this.statusToggleConfirmModal).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Form state
  async expectRepositoryNameValue(value: string): Promise<void> {
    await expect(this.repositoryNameInput).toHaveValue(value, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectGitUrlValue(value: string): Promise<void> {
    await expect(this.gitUrlInput).toHaveValue(value, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectDefaultBranchValue(value: string): Promise<void> {
    await expect(this.defaultBranchInput).toHaveValue(value, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectProviderValue(value: string): Promise<void> {
    await expect(this.providerSelect).toHaveValue(value, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectTokenFieldMasked(): Promise<void> {
    const type = await this.accessTokenInput.getAttribute('type')
    expect(type).toBe('password')
  }

  async expectTokenFieldVisible(): Promise<void> {
    const type = await this.accessTokenInput.getAttribute('type')
    expect(type).toBe('text')
  }

  // Assertions - Buttons state
  async expectSaveButtonEnabled(): Promise<void> {
    await expect(this.saveButton).toBeEnabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectSaveButtonDisabled(): Promise<void> {
    await expect(this.saveButton).toBeDisabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectDeleteConfirmButtonEnabled(): Promise<void> {
    await expect(this.deleteConfirmButton).toBeEnabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectDeleteConfirmButtonDisabled(): Promise<void> {
    await expect(this.deleteConfirmButton).toBeDisabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Error messages
  async expectNameError(message?: string | RegExp): Promise<void> {
    await expect(this.nameErrorMessage).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    if (message) {
      await expect(this.nameErrorMessage).toContainText(message, { timeout: TEST_TIMEOUTS.ACTION })
    }
  }

  async expectUrlError(message?: string | RegExp): Promise<void> {
    await expect(this.urlErrorMessage).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    if (message) {
      await expect(this.urlErrorMessage).toContainText(message, { timeout: TEST_TIMEOUTS.ACTION })
    }
  }

  async expectBranchError(message?: string | RegExp): Promise<void> {
    await expect(this.branchErrorMessage).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    if (message) {
      await expect(this.branchErrorMessage).toContainText(message, { timeout: TEST_TIMEOUTS.ACTION })
    }
  }

  // Assertions - Test connection
  async expectTestConnectionLoading(): Promise<void> {
    await expect(this.testConnectionSpinner).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectTestConnectionSuccess(): Promise<void> {
    await expect(this.testConnectionSuccess).toBeVisible({ timeout: TEST_TIMEOUTS.API_CALL })
  }

  async expectTestConnectionError(): Promise<void> {
    await expect(this.testConnectionError).toBeVisible({ timeout: TEST_TIMEOUTS.API_CALL })
  }

  async getTestConnectionErrorMessage(): Promise<string | null> {
    return this.testConnectionError.textContent()
  }

  // Assertions - Modal visibility
  async expectAddModalClosed(): Promise<void> {
    await expect(this.addRepositoryModal).not.toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectEditModalClosed(): Promise<void> {
    await expect(this.editRepositoryModal).not.toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRemoveModalClosed(): Promise<void> {
    await expect(this.removeRepositoryModal).not.toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStatusToggleConfirmClosed(): Promise<void> {
    await expect(this.statusToggleConfirmModal).not.toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectModalTitle(title: string | RegExp): Promise<void> {
    const modal = this.addRepositoryModal.or(this.editRepositoryModal).or(this.removeRepositoryModal)
    const titleElement = modal.locator('h2')
    await expect(titleElement).toContainText(title, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async getModalWarningMessage(): Promise<string | null> {
    const modal = this.removeRepositoryModal
    const warningElement = modal.locator('[data-testid="warning-message"]')
    return warningElement.textContent()
  }
}
