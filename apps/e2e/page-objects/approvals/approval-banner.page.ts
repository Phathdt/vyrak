import { TEST_TIMEOUTS } from '@config/test.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Page } from '@playwright/test'

/**
 * Approval Banner Page Object
 * Handles approval status indicator banner on workflow detail page (Story 14.1)
 */
export class ApprovalBannerPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators - Banner
  private get bannerContainer() {
    return this.getPage().locator('[data-testid*="approval-banner"], [class*="approval-banner"]').first()
  }

  private get bannerMessage() {
    return this.bannerContainer.locator('text=/waiting for approval|paused/i')
  }

  private get bannerTimestamp() {
    return this.bannerContainer.locator('text=/waiting since|ago/i')
  }

  private get reviewApproveButton() {
    return this.bannerContainer.getByRole('button', { name: /review.*approve|review & approve/i })
  }

  // Locators - Status Badge in List
  private get statusBadgeWaiting() {
    return this.getPage().locator('[data-testid*="status-waiting"], text=/waiting approval/i').first()
  }

  private get approvalBadgeCount() {
    return this.getPage().locator('[data-testid*="approval-count"], text=/workflows? awaiting approval/i')
  }

  // Locators - Browser Notification
  private get notificationPermissionRequest() {
    return this.getPage().locator('[role="dialog"]', { hasText: /notification|permission/i })
  }

  private get notificationAllowButton() {
    return this.notificationPermissionRequest.getByRole('button', { name: /allow|enable/i })
  }

  private get notificationDenyButton() {
    return this.notificationPermissionRequest.getByRole('button', { name: /deny|disable|not now/i })
  }

  // Actions - Banner Interaction
  async clickReviewApprove(): Promise<void> {
    await this.reviewApproveButton.click({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async getBannerText(): Promise<string | null> {
    return await this.bannerMessage.textContent()
  }

  async getTimestampText(): Promise<string | null> {
    return await this.bannerTimestamp.textContent()
  }

  // Actions - Notification Permission
  async allowBrowserNotification(): Promise<void> {
    const isVisible = await this.notificationAllowButton.isVisible().catch(() => false)
    if (isVisible) {
      await this.notificationAllowButton.click()
    }
  }

  async denyBrowserNotification(): Promise<void> {
    const isVisible = await this.notificationDenyButton.isVisible().catch(() => false)
    if (isVisible) {
      await this.notificationDenyButton.click()
    }
  }

  async getApprovalBadgeCount(): Promise<string | null> {
    return await this.approvalBadgeCount.textContent()
  }

  // Assertions - Banner State
  async expectBannerVisible(): Promise<void> {
    await expect(this.bannerContainer).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectBannerNotVisible(): Promise<void> {
    await expect(this.bannerContainer).not.toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectBannerShowsMessage(message: string | RegExp): Promise<void> {
    await expect(this.bannerMessage).toContainText(message, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectBannerShowsTimestamp(): Promise<void> {
    await expect(this.bannerTimestamp).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectReviewButtonVisible(): Promise<void> {
    await expect(this.reviewApproveButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectReviewButtonEnabled(): Promise<void> {
    await expect(this.reviewApproveButton).toBeEnabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStatusBadgeWaiting(): Promise<void> {
    await expect(this.statusBadgeWaiting).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectApprovalBadgeVisible(): Promise<void> {
    await expect(this.approvalBadgeCount).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectNotificationPermissionRequest(): Promise<void> {
    await expect(this.notificationPermissionRequest).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }
}
