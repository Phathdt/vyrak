import { TEST_TIMEOUTS } from '@config/test.config'
import { URLS } from '@config/urls.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Page } from '@playwright/test'

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators
  private get emailInput() {
    return this.page.getByPlaceholder(/email/i)
  }

  private get passwordInput() {
    return this.page.getByPlaceholder(/password/i)
  }

  private get submitButton() {
    return this.page.getByRole('button', { name: /sign in|log in|login/i })
  }

  private get registerLink() {
    return this.page.getByRole('link', { name: /register|sign up|create account/i })
  }

  private get errorMessage() {
    return this.page.locator('[role="alert"], .error, .alert-error').first()
  }

  // Actions
  async navigate(): Promise<void> {
    await this.goto(URLS.ROUTES.LOGIN)
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email)
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password)
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click()
  }

  async fillAndSubmit(email: string, password: string): Promise<void> {
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.clickSubmit()
  }

  async clickRegisterLink(): Promise<void> {
    await this.registerLink.click()
  }

  // Assertions
  async expectOnLoginPage(): Promise<void> {
    await this.expectUrlToMatch(/\/login/)
  }

  async expectRedirectedToHome(): Promise<void> {
    await this.expectUrlToMatch(/^\/$|\/home|\/dashboard/)
    await expect(this.page).not.toHaveURL(/\/login/, {
      timeout: TEST_TIMEOUTS.NAVIGATION,
    })
  }

  async expectErrorVisible(message?: string | RegExp): Promise<void> {
    const error = this.errorMessage
    await expect(error).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })

    if (message) {
      await expect(error).toContainText(message, { timeout: TEST_TIMEOUTS.ACTION })
    }
  }

  async expectSubmitDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectSubmitEnabled(): Promise<void> {
    await expect(this.submitButton).toBeEnabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectEmailError(): Promise<void> {
    const emailError = this.page.locator('[data-testid="email-error"], #email-error')
    await expect(emailError).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPasswordError(): Promise<void> {
    const passwordError = this.page.locator('[data-testid="password-error"], #password-error')
    await expect(passwordError).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }
}
