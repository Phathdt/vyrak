import type { Page } from '@playwright/test'

export class StorageHelper {
  /**
   * Set item in localStorage
   */
  static async setLocalStorage(page: Page, key: string, value: string): Promise<void> {
    await page.evaluate(
      ({ key, value }) => localStorage.setItem(key, value),
      { key, value }
    )
  }

  /**
   * Get item from localStorage
   */
  static async getLocalStorage(page: Page, key: string): Promise<string | null> {
    return page.evaluate((key) => localStorage.getItem(key), key)
  }

  /**
   * Clear localStorage
   */
  static async clearLocalStorage(page: Page): Promise<void> {
    await page.evaluate(() => localStorage.clear())
  }

  /**
   * Set auth token in localStorage
   */
  static async setAuthToken(page: Page, token: string): Promise<void> {
    await this.setLocalStorage(page, 'token', token)
  }

  /**
   * Get auth token from localStorage
   */
  static async getAuthToken(page: Page): Promise<string | null> {
    return this.getLocalStorage(page, 'token')
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(page: Page): Promise<boolean> {
    const token = await this.getAuthToken(page)
    return !!token
  }
}
