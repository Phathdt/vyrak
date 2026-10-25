import { TEST_TIMEOUTS } from '@config/test.config'
import { URLS } from '@config/urls.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Page } from '@playwright/test'

export class RegisterPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators
  private get emailInput() {
    return this.page.getByPlaceholder(/email/i)
  }

  private get passwordInput() {
    return this.page.getByPlaceholder(/^password/i).first()
  }

  private get confirmPasswordInput() {
    return this.page.getByPlaceholder(/confirm password|password confirmation/i)
  }

  private get submitButton() {
    return this.page.getByRole('button', { name: /sign up|register|create account/i })
  }

  // Actions
  async navigate(): Promise<void> {
    await this.goto(URLS.ROUTES.REGISTER)
  }

  async fillRegistrationForm(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)

    // Fill confirm password if exists
    const confirmPasswordVisible = await this.confirmPasswordInput.isVisible().catch(() => false)
    if (confirmPasswordVisible) {
      await this.confirmPasswordInput.fill(password)
    }
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click()
  }

  async registerUser(email: string, password: string): Promise<void> {
    await this.fillRegistrationForm(email, password)
    await this.clickSubmit()
  }

  // Assertions
  async expectOnRegisterPage(): Promise<void> {
    await this.expectUrlToMatch(/\/register/)
  }

  async expectRedirectedToHome(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/register/, {
      timeout: TEST_TIMEOUTS.NAVIGATION,
    })
  }

  async expectErrorVisible(message?: string | RegExp): Promise<void> {
    const error = this.page.locator('[role="alert"], .error').first()
    await expect(error).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })

    if (message) {
      await expect(error).toContainText(message)
    }
  }
}
