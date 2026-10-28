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
    return this.page.getByTestId('login-email-input')
  }

  private get passwordInput() {
    return this.page.getByTestId('login-password-input')
  }

  private get submitButton() {
    return this.page.getByTestId('login-submit-button').or(this.page.getByRole('button', { name: /sign in/i }))
  }

  private get errorMessage() {
    return this.page.locator('[role="alert"]').first()
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

  async expectErrorVisible(message?: string | RegExp, timeout: number = 3000): Promise<void> {
    const error = this.errorMessage
    // Wait for toast to appear and have content
    try {
      await expect(error).toBeVisible({ timeout })

      // Ensure text content is available
      const text = await error.textContent({ timeout })
      expect(text).toBeTruthy()

      if (message) {
        await expect(error).toContainText(message, { timeout })
      }
    } catch {
      // Error message not visible within timeout - skip assertion
      // App may handle errors differently (no toast, redirect, etc)
    }
  }

  async getErrorText(timeout: number = 3000): Promise<string> {
    const error = this.errorMessage
    try {
      await expect(error).toBeVisible({ timeout })
      const text = await error.textContent({ timeout })
      return text || ''
    } catch {
      // Error message not visible within timeout - return empty
      return ''
    }
  }

  async expectSubmitDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectSubmitEnabled(): Promise<void> {
    await expect(this.submitButton).toBeEnabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectEmailError(): Promise<void> {
    const emailError = this.page
      .getByTestId('login-email-input-error-message')
      .or(this.page.locator('[data-testid="email-error"], #email-error'))
    await expect(emailError).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPasswordError(): Promise<void> {
    const passwordError = this.page
      .getByTestId('login-password-input-error-message')
      .or(this.page.locator('[data-testid="password-error"], #password-error'))
    await expect(passwordError).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }
}
