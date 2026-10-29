import { BasePage } from '@page-objects/base.page'
import { type Page } from '@playwright/test'

export class RepositoryCardPage extends BasePage {
  constructor(
    page: Page,
    private readonly repositoryName: string
  ) {
    super(page)
  }

  // Card locator
  private get card() {
    return this.page.locator(`[data-testid="repository-card-${this.repositoryName}"]`)
  }

  // Card elements
  private get providerIcon() {
    return this.card.locator('[data-testid="repository-provider-icon"]')
  }

  private get nameElement() {
    return this.card.locator('[data-testid="repository-name"]')
  }

  private get urlElement() {
    return this.card.locator('[data-testid="repository-url"]')
  }

  private get branchBadge() {
    return this.card.locator('[data-testid="repository-branch"]')
  }

  private get statusBadge() {
    return this.card.locator('[data-testid="repository-status-badge"]')
  }

  private get updatedAtElement() {
    return this.card.locator('[data-testid="repository-updated-at"]')
  }

  private get editButton() {
    return this.card.locator('[data-testid="repository-edit-button"]')
  }

  private get testConnectionButton() {
    return this.card.locator('[data-testid="repository-test-button"]')
  }

  private get removeButton() {
    return this.card.locator('[data-testid="repository-remove-button"]')
  }

  private get statusToggle() {
    return this.card.locator('[data-testid="repository-status-toggle"]')
  }

  // Actions
  async clickEdit(): Promise<void> {
    await this.editButton.click()
  }

  async clickTestConnection(): Promise<void> {
    await this.testConnectionButton.click()
  }

  async clickRemove(): Promise<void> {
    await this.removeButton.click()
  }

  async toggleStatus(): Promise<void> {
    await this.statusToggle.click()
  }

  async clickCard(): Promise<void> {
    await this.card.click()
  }

  async hoverCard(): Promise<void> {
    await this.card.hover()
  }

  // Getters
  async getName(): Promise<string | null> {
    return this.nameElement.textContent()
  }

  async getUrl(): Promise<string | null> {
    return this.urlElement.getAttribute('title')
  }

  async getBranch(): Promise<string | null> {
    return this.branchBadge.textContent()
  }

  async getStatus(): Promise<'active' | 'inactive' | null> {
    const text = await this.statusBadge.textContent()
    if (text?.includes('Active')) return 'active'
    if (text?.includes('Inactive')) return 'inactive'
    return null
  }

  async getUpdatedAt(): Promise<string | null> {
    return this.updatedAtElement.textContent()
  }

  async getProvider(): Promise<'github' | 'gitlab' | 'bitbucket' | null> {
    const ariaLabel = await this.providerIcon.getAttribute('aria-label')
    if (ariaLabel?.includes('GitHub')) return 'github'
    if (ariaLabel?.includes('GitLab')) return 'gitlab'
    if (ariaLabel?.includes('Bitbucket')) return 'bitbucket'
    return null
  }

  async isActive(): Promise<boolean> {
    const status = await this.getStatus()
    return status === 'active'
  }

  async isInactive(): Promise<boolean> {
    const status = await this.getStatus()
    return status === 'inactive'
  }

  // Assertions
  async expectVisible(): Promise<void> {
    await this.card.isVisible()
  }

  async expectNotVisible(): Promise<void> {
    await this.card.isHidden()
  }

  async expectEditButtonVisible(): Promise<void> {
    await this.editButton.isVisible()
  }

  async expectTestButtonVisible(): Promise<void> {
    await this.testConnectionButton.isVisible()
  }

  async expectRemoveButtonVisible(): Promise<void> {
    await this.removeButton.isVisible()
  }

  async expectStatusToggleVisible(): Promise<void> {
    await this.statusToggle.isVisible()
  }

  async expectBranch(branch: string): Promise<void> {
    await this.branchBadge.filter({ hasText: branch }).isVisible()
  }

  async expectProvider(provider: 'github' | 'gitlab' | 'bitbucket'): Promise<void> {
    const actual = await this.getProvider()
    if (actual !== provider) {
      throw new Error(`Expected provider ${provider}, got ${actual}`)
    }
  }

  async expectStatusActive(): Promise<void> {
    await this.statusBadge.filter({ hasText: /Active/i }).isVisible()
  }

  async expectStatusInactive(): Promise<void> {
    await this.statusBadge.filter({ hasText: /Inactive/i }).isVisible()
  }

  async expectInactiveStyles(): Promise<void> {
    const opacity = await this.card.evaluate((el) => window.getComputedStyle(el).opacity)
    if (parseFloat(opacity as string) === 1) {
      throw new Error('Card should have reduced opacity for inactive status')
    }
  }

  async expectActiveStyles(): Promise<void> {
    const opacity = await this.card.evaluate((el) => window.getComputedStyle(el).opacity)
    if (parseFloat(opacity as string) < 1) {
      throw new Error('Card should have normal opacity for active status')
    }
  }
}
