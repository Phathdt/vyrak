import { TEST_TIMEOUTS } from '@config/test.config'
import { expect, type Locator, type Page } from '@playwright/test'

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Navigate to a URL and wait for page load
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url, {
      waitUntil: 'networkidle',
      timeout: TEST_TIMEOUTS.NAVIGATION,
    })
  }

  /**
   * Wait for a selector to be visible
   */
  async waitForVisible(selector: string): Promise<Locator> {
    const locator = this.page.locator(selector)
    await expect(locator).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    return locator
  }

  /**
   * Wait for network idle
   */
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle', {
      timeout: TEST_TIMEOUTS.API_CALL,
    })
  }

  /**
   * Fill input by placeholder
   */
  async fillByPlaceholder(placeholder: string | RegExp, value: string): Promise<void> {
    await this.page.getByPlaceholder(placeholder).fill(value)
  }

  /**
   * Click button by role and name
   */
  async clickButton(name: string | RegExp): Promise<void> {
    await this.page.getByRole('button', { name }).click()
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url()
  }

  /**
   * Check if current URL matches pattern
   */
  async expectUrlToMatch(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern, { timeout: TEST_TIMEOUTS.NAVIGATION })
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return this.page.title()
  }

  /**
   * Take screenshot
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true,
    })
  }

  /**
   * Wait for API response
   */
  async waitForResponse(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForResponse(urlPattern, {
      timeout: TEST_TIMEOUTS.API_CALL,
    })
  }

  /**
   * Reload page
   */
  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' })
  }
}
