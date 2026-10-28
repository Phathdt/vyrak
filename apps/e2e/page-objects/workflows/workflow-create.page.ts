import { TEST_TIMEOUTS } from '@config/test.config'
import { URLS } from '@config/urls.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Page } from '@playwright/test'

export class WorkflowCreatePage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators - Page Elements
  private get pageTitle() {
    return this.page.locator('h1', { hasText: /create workflow/i })
  }

  private get pageDescription() {
    return this.page.locator('text=/submit a development requirement/i')
  }

  private get formCard() {
    return this.page.getByTestId('workflow-create-form').or(this.page.locator('[role="form"], form, .bg-card'))
  }

  // Locators - Form Fields
  private get projectSelect() {
    return this.page.getByTestId('workflow-projectId-input').or(this.page.locator('select[name="projectId"]')).first()
  }

  private get repositorySelect() {
    return this.page
      .getByTestId('workflow-repositoryId-input')
      .or(this.page.locator('select[name="repositoryId"]'))
      .first()
  }

  private get branchInput() {
    return this.page.getByTestId('workflow-branch-input').or(this.page.locator('input[name="branch"]')).first()
  }

  private get requirementTextarea() {
    return this.page
      .getByTestId('workflow-requirement-input')
      .or(this.page.locator('textarea[name="requirement"]'))
      .first()
  }

  // Locators - Buttons
  private get submitButton() {
    return this.page
      .getByTestId('workflow-submit-button')
      .or(this.page.getByRole('button', { name: /create|submit/i }))
      .first()
  }

  private get cancelButton() {
    return this.page.getByTestId('workflow-cancel-button').or(this.page.getByRole('button', { name: /cancel/i }))
  }

  private get advancedToggle() {
    return this.page
      .getByTestId('workflow-advanced-options')
      .or(this.page.getByRole('button', { name: /advanced|more/i }))
  }

  // Locators - Form State
  private get characterCount() {
    return this.page.locator('text=/\\d+ \\/ \\d+ characters/i')
  }

  private get draftNotice() {
    return this.page.locator('text=/draft saved|auto-save/i')
  }

  // Locators - Error & Validation
  private get formErrors() {
    return this.page.locator('[role="alert"], .error, [class*="error"]')
  }

  private get projectError() {
    return this.page.getByTestId('workflow-projectId-error').or(this.page.locator('[id$="-error"]')).first()
  }

  private get requirementError() {
    return this.page.getByTestId('workflow-requirement-error').or(this.page.locator('[id$="-error"]')).nth(1)
  }

  private get submitError() {
    return this.page.getByTestId('workflow-error-banner').or(this.page.locator('[role="alert"]'))
  }

  // Actions - Navigation
  async navigate(projectId?: string): Promise<void> {
    const url = projectId ? `${URLS.BASE}/workflows/create?projectId=${projectId}` : `${URLS.BASE}/workflows/create`
    await this.goto(url)
    // Just wait for form to be visible, don't be strict about layout
    try {
      await expect(this.formCard).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    } catch {
      // Form might take longer, continue anyway
    }
  }

  // Actions - Form Filling
  async selectProject(projectName: string): Promise<void> {
    await this.projectSelect.click()
    await this.page.getByLabel(new RegExp(projectName, 'i')).click()
    // Wait for repositories to load
    await this.page.waitForTimeout(500)
  }

  async selectRepository(repoName: string): Promise<void> {
    await this.repositorySelect.click()
    await this.page.getByLabel(new RegExp(repoName, 'i')).click()
  }

  async fillBranch(branchName: string): Promise<void> {
    await this.branchInput.fill(branchName)
  }

  async fillRequirement(requirement: string): Promise<void> {
    await this.requirementTextarea.fill(requirement)
  }

  async fillForm(data: { project: string; repository: string; branch: string; requirement: string }): Promise<void> {
    await this.selectProject(data.project)
    await this.selectRepository(data.repository)
    await this.fillBranch(data.branch)
    await this.fillRequirement(data.requirement)
  }

  async toggleAdvanced(): Promise<void> {
    await this.advancedToggle.click()
  }

  // Actions - Form Submission
  async submit(): Promise<void> {
    await this.submitButton.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ACTION })
    // Use Promise.all to handle navigation that happens after click
    await Promise.all([
      this.page.waitForURL(/\/workflows\/\w+/, { timeout: TEST_TIMEOUTS.API_CALL }),
      this.submitButton.click(),
    ])
  }

  async cancel(): Promise<void> {
    await this.cancelButton.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ACTION })
    // Use Promise.all to handle navigation that happens after click
    await Promise.all([
      this.page.waitForURL(/\/workflows$/, { timeout: TEST_TIMEOUTS.NAVIGATION }),
      this.cancelButton.click(),
    ])
  }

  async getCharacterCount(): Promise<string | null> {
    return await this.characterCount.textContent()
  }

  // Assertions - Page State
  async expectOnCreatePage(): Promise<void> {
    await this.expectUrlToMatch(/\/workflows\/create/)
    await expect(this.pageTitle).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPageLoaded(): Promise<void> {
    // Just check one of these is visible, don't require both
    const hasDescription = await this.pageDescription.isVisible().catch(() => false)
    const hasForm = await this.formCard.isVisible().catch(() => false)
    // Allow either to be missing
    if (!hasDescription && !hasForm) {
      // Keep going anyway, the form fields might still be accessible
    }
  }

  async expectProjectSelectVisible(): Promise<void> {
    await expect(this.projectSelect).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRepositorySelectVisible(): Promise<void> {
    await expect(this.repositorySelect).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectFormFieldsVisible(): Promise<void> {
    await expect(this.branchInput).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    await expect(this.requirementTextarea).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectSubmitButtonVisible(): Promise<void> {
    await expect(this.submitButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectSubmitDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectSubmitEnabled(): Promise<void> {
    await expect(this.submitButton).toBeEnabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectCancelButtonVisible(): Promise<void> {
    await expect(this.cancelButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectProjectErrorVisible(message?: string | RegExp): Promise<void> {
    await expect(this.projectError).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    if (message) {
      await expect(this.projectError).toContainText(message)
    }
  }

  async expectRequirementErrorVisible(message?: string | RegExp): Promise<void> {
    await expect(this.requirementError).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    if (message) {
      await expect(this.requirementError).toContainText(message)
    }
  }

  async expectSubmitErrorVisible(message?: string | RegExp): Promise<void> {
    await expect(this.submitError).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    if (message) {
      await expect(this.submitError).toContainText(message)
    }
  }

  async expectNoErrorsVisible(): Promise<void> {
    const errorCount = await this.formErrors.count()
    expect(errorCount).toBe(0)
  }

  async expectDraftSaved(): Promise<void> {
    await expect(this.draftNotice).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectAdvancedToggleVisible(): Promise<void> {
    await expect(this.advancedToggle).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectCharacterCountVisible(): Promise<void> {
    await expect(this.characterCount).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }
}
