import { TEST_TIMEOUTS } from '@config/test.config'
import { URLS } from '@config/urls.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Page } from '@playwright/test'

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators
  private get welcomeMessage() {
    return this.page.locator('[data-testid="welcome-message"], h1, h2').first()
  }

  private get userInfo() {
    return this.page.locator('[data-testid="user-info"]')
  }

  private get logoutButton() {
    return this.page.getByRole('button', { name: /log ?out|sign ?out/i })
  }

  private get mainContent() {
    return this.page.locator('[data-testid="dashboard-content"], main, .dashboard')
  }

  // Actions
  async navigate(): Promise<void> {
    await this.goto(URLS.ROUTES.DASHBOARD)
  }

  async clickLogout(): Promise<void> {
    await this.logoutButton.click()
  }

  async getUserEmail(): Promise<string | null> {
    const userInfoText = await this.userInfo.textContent()
    return userInfoText
  }

  // Assertions
  async expectOnDashboard(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: TEST_TIMEOUTS.NAVIGATION })
  }

  async expectWelcomeMessageVisible(): Promise<void> {
    await expect(this.welcomeMessage).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectUserInfoVisible(): Promise<void> {
    await expect(this.userInfo).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectMainContentVisible(): Promise<void> {
    await expect(this.mainContent).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectLogoutButtonVisible(): Promise<void> {
    await expect(this.logoutButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }
}
