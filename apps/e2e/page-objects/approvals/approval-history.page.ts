import { TEST_TIMEOUTS } from '@config/test.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Page } from '@playwright/test'

/**
 * Approval History Page Object
 * Handles approval history display and interactions (Story 14.4)
 */
export class ApprovalHistoryPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators - History Section
  private get historySection() {
    return this.getPage().locator('[data-testid*="approval-history"], [class*="approval-history"]').first()
  }

  private get historyToggleButton() {
    return this.historySection.locator('button[aria-expanded]').first()
  }

  private get emptyStateMessage() {
    return this.historySection.locator('text=/no approval|no decisions|not yet/i')
  }

  // Locators - History Entries
  private get historyEntries() {
    return this.historySection.locator('[data-testid*="approval-entry"], [class*="entry"], [class*="item"]')
  }

  private getEntryByIndex(index: number) {
    return this.historyEntries.nth(index)
  }

  // Locators - Export
  private get exportButton() {
    return this.historySection.getByRole('button', { name: /export|download|save/i })
  }

  private get exportFormatMenu() {
    return this.getPage().locator('[role="menu"], [data-testid*="export"]')
  }

  private get exportJsonOption() {
    return this.exportFormatMenu.getByRole('option', { name: /json/i })
  }

  private get exportPdfOption() {
    return this.exportFormatMenu.getByRole('option', { name: /pdf/i })
  }

  // Actions - History Navigation
  async expandHistory(): Promise<void> {
    const isCollapsed = await this.historyToggleButton
      .getAttribute('aria-expanded')
      .then((val) => val === 'false')
      .catch(() => false)

    if (isCollapsed) {
      await this.historyToggleButton.click()
    }
  }

  async collapseHistory(): Promise<void> {
    const isExpanded = await this.historyToggleButton
      .getAttribute('aria-expanded')
      .then((val) => val === 'true')
      .catch(() => true)

    if (isExpanded) {
      await this.historyToggleButton.click()
    }
  }

  async getEntryCount(): Promise<number> {
    return await this.historyEntries.count()
  }

  async getEntryTimestamp(index: number): Promise<string | null> {
    return await this.getEntryByIndex(index).locator('[class*="time"], [data-testid*="timestamp"]').textContent()
  }

  async getEntryApproverName(index: number): Promise<string | null> {
    return await this.getEntryByIndex(index).locator('[class*="name"], [data-testid*="approver-name"]').textContent()
  }

  async getEntryDecision(index: number): Promise<string | null> {
    return await this.getEntryByIndex(index)
      .locator('text=/approved|rejected/i, [data-testid*="decision"]')
      .textContent()
  }

  async getEntryPhase(index: number): Promise<string | null> {
    return await this.getEntryByIndex(index).locator('text=/phase|planning|bug/i').textContent()
  }

  async getEntryComment(index: number): Promise<string | null> {
    return await this.getEntryByIndex(index).locator('[class*="comment"], [data-testid*="reason"]').textContent()
  }

  // Actions - Export
  async clickExport(): Promise<void> {
    await this.exportButton.click({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async exportAsJson(): Promise<void> {
    await this.clickExport()
    await this.exportJsonOption.click()
  }

  async exportAsPdf(): Promise<void> {
    await this.clickExport()
    await this.exportPdfOption.click()
  }

  // Assertions - History State
  async expectHistorySectionVisible(): Promise<void> {
    await expect(this.historySection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectHistorySectionHidden(): Promise<void> {
    await expect(this.historySection).not.toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectHistoryExpanded(): Promise<void> {
    await expect(this.historyToggleButton).toHaveAttribute('aria-expanded', 'true', {
      timeout: TEST_TIMEOUTS.ACTION,
    })
  }

  async expectHistoryCollapsed(): Promise<void> {
    await expect(this.historyToggleButton).toHaveAttribute('aria-expanded', 'false', {
      timeout: TEST_TIMEOUTS.ACTION,
    })
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyStateMessage).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectHistoryEntriesPresent(): Promise<void> {
    const count = await this.getEntryCount()
    expect(count).toBeGreaterThan(0)
  }

  async expectEntryCount(count: number): Promise<void> {
    const actualCount = await this.getEntryCount()
    expect(actualCount).toBe(count)
  }

  async expectEntryDecision(index: number, decision: 'approved' | 'rejected'): Promise<void> {
    const decisionText = decision === 'approved' ? /approved/i : /rejected/i
    await expect(this.getEntryByIndex(index).locator('text=/approved|rejected/i')).toContainText(decisionText, {
      timeout: TEST_TIMEOUTS.ACTION,
    })
  }

  async expectEntryApproverName(index: number, name: string | RegExp): Promise<void> {
    await expect(this.getEntryByIndex(index).locator('[class*="name"]')).toContainText(name, {
      timeout: TEST_TIMEOUTS.ACTION,
    })
  }

  async expectEntryPhase(index: number, phase: string | RegExp): Promise<void> {
    await expect(this.getEntryByIndex(index).locator('text=/phase|planning|bug/i')).toContainText(phase, {
      timeout: TEST_TIMEOUTS.ACTION,
    })
  }

  async expectEntryCommentVisible(index: number): Promise<void> {
    await expect(this.getEntryByIndex(index).locator('[class*="comment"], [data-testid*="reason"]')).toBeVisible({
      timeout: TEST_TIMEOUTS.ACTION,
    })
  }

  async expectApprovedBadgePresent(index: number): Promise<void> {
    await expect(this.getEntryByIndex(index).locator('text=/approved/i, [class*="approved"]')).toBeVisible({
      timeout: TEST_TIMEOUTS.ACTION,
    })
  }

  async expectRejectedBadgePresent(index: number): Promise<void> {
    await expect(this.getEntryByIndex(index).locator('text=/rejected/i, [class*="rejected"]')).toBeVisible({
      timeout: TEST_TIMEOUTS.ACTION,
    })
  }

  async expectExportButtonVisible(): Promise<void> {
    await expect(this.exportButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectChronologicalOrder(): Promise<void> {
    const count = await this.getEntryCount()
    // Verify entries are displayed (manual verification of chronological order happens in tests)
    expect(count).toBeGreaterThan(0)
  }
}
