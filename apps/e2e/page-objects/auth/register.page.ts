import { TEST_TIMEOUTS } from '@config/test.config'
import { URLS } from '@config/urls.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Page } from '@playwright/test'

export class RegisterPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators
  private get loginLink() {
    return this.page.getByRole('link', { name: /sign in/i })
  }

  private get disabledMessage() {
    return this.page.locator('text=Signup is temporarily disabled')
  }

  // Actions
  async navigate(): Promise<void> {
    await this.goto(URLS.ROUTES.REGISTER)
  }

  async clickLoginLink(): Promise<void> {
    await this.loginLink.click()
  }

  async registerUser(_email: string, _password: string): Promise<void> {
    // Signup is disabled in current UI - throw informative error
    throw new Error('User registration is not available. Signup is currently disabled.')
  }

  async fillRegistrationForm(_email: string, _password: string): Promise<void> {
    // Signup is disabled - no form to fill
    throw new Error('User registration is not available. Signup is currently disabled.')
  }

  async clickSubmit(): Promise<void> {
    // Signup is disabled - no submit button
    throw new Error('User registration is not available. Signup is currently disabled.')
  }

  // Assertions
  async expectOnRegisterPage(): Promise<void> {
    await this.expectUrlToMatch(/\/signup/)
  }

  async expectSignupDisabled(): Promise<void> {
    await expect(this.disabledMessage).toBeVisible({
      timeout: TEST_TIMEOUTS.ACTION,
    })
  }

  async expectRedirectedToLogin(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login/, {
      timeout: TEST_TIMEOUTS.NAVIGATION,
    })
  }

  async expectRedirectedToHome(): Promise<void> {
    // Signup is disabled - can't redirect after registration
    throw new Error('User registration is not available. Signup is currently disabled.')
  }

  async expectErrorVisible(_message?: string | RegExp): Promise<void> {
    // Signup is disabled - no error messages from form
    throw new Error('User registration is not available. Signup is currently disabled.')
  }
}
