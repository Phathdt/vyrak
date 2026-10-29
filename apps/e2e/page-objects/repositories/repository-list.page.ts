import { TEST_TIMEOUTS } from '@config/test.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Locator, type Page } from '@playwright/test'

export class RepositoryListPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators
  private get repositoriesSection() {
    return this.page.locator('[data-testid="repositories-section"]')
  }

  private get addRepositoryButton() {
    return this.page.getByRole('button', { name: /add repository/i })
  }

  private get emptyStateMessage() {
    return this.page.locator('[data-testid="repositories-empty-state"]')
  }

  private get emptyStateCTA() {
    return this.page
      .locator('[data-testid="repositories-empty-state"]')
      .getByRole('button', { name: /add repository/i })
  }

  private get repositoryCards() {
    return this.page.locator('[data-testid^="repository-card-"]')
  }

  private get repositoriesHeader() {
    return this.page.locator('[data-testid="repositories-header"]')
  }

  // Actions
  async navigateToProjectDetail(projectId: string): Promise<void> {
    await this.goto(`/projects/${projectId}`)
  }

  async clickAddRepository(): Promise<void> {
    await this.addRepositoryButton.click()
  }

  async clickAddRepositoryFromEmptyState(): Promise<void> {
    await this.emptyStateCTA.click()
  }

  async getRepositoryCardByName(name: string): Promise<Locator> {
    return this.page.locator(`[data-testid="repository-card-${name}"]`)
  }

  async clickEditRepository(name: string): Promise<void> {
    const card = await this.getRepositoryCardByName(name)
    await card.locator('[data-testid="repository-edit-button"]').click()
  }

  async clickTestConnection(name: string): Promise<void> {
    const card = await this.getRepositoryCardByName(name)
    await card.locator('[data-testid="repository-test-button"]').click()
  }

  async clickRemoveRepository(name: string): Promise<void> {
    const card = await this.getRepositoryCardByName(name)
    await card.locator('[data-testid="repository-remove-button"]').click()
  }

  async clickRepositoryStatusToggle(name: string): Promise<void> {
    const card = await this.getRepositoryCardByName(name)
    await card.locator('[data-testid="repository-status-toggle"]').click()
  }

  async getRepositoryCount(): Promise<number> {
    return this.repositoryCards.count()
  }

  async getRepositoryNames(): Promise<string[]> {
    const cards = await this.repositoryCards.all()
    const names: string[] = []
    for (const card of cards) {
      const nameElement = card.locator('[data-testid="repository-name"]')
      const text = await nameElement.textContent()
      if (text) {
        names.push(text.trim())
      }
    }
    return names
  }

  async getRepositoryStatus(name: string): Promise<'active' | 'inactive' | null> {
    const card = await this.getRepositoryCardByName(name)
    const statusBadge = card.locator('[data-testid="repository-status-badge"]')
    const text = await statusBadge.textContent()
    if (text?.includes('Active')) return 'active'
    if (text?.includes('Inactive')) return 'inactive'
    return null
  }

  async getRepositoryBranch(name: string): Promise<string | null> {
    const card = await this.getRepositoryCardByName(name)
    const branchBadge = card.locator('[data-testid="repository-branch"]')
    return branchBadge.textContent()
  }

  async getRepositoryURL(name: string): Promise<string | null> {
    const card = await this.getRepositoryCardByName(name)
    const urlElement = card.locator('[data-testid="repository-url"]')
    return urlElement.getAttribute('title')
  }

  async getRepositoryProvider(name: string): Promise<'github' | 'gitlab' | 'bitbucket' | null> {
    const card = await this.getRepositoryCardByName(name)
    const iconElement = card.locator('[data-testid="repository-provider-icon"]')
    const ariaLabel = await iconElement.getAttribute('aria-label')
    if (ariaLabel?.includes('GitHub')) return 'github'
    if (ariaLabel?.includes('GitLab')) return 'gitlab'
    if (ariaLabel?.includes('Bitbucket')) return 'bitbucket'
    return null
  }

  // Assertions
  async expectRepositoriesSectionVisible(): Promise<void> {
    await expect(this.repositoriesSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectAddRepositoryButtonVisible(): Promise<void> {
    await expect(this.addRepositoryButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyStateMessage).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRepositoriesCount(count: number): Promise<void> {
    await expect(this.repositoryCards).toHaveCount(count, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRepositoryVisible(name: string): Promise<void> {
    const card = await this.getRepositoryCardByName(name)
    await expect(card).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRepositoryNotVisible(name: string): Promise<void> {
    const card = await this.getRepositoryCardByName(name)
    await expect(card).not.toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRepositoryStatus(name: string, status: 'active' | 'inactive'): Promise<void> {
    const card = await this.getRepositoryCardByName(name)
    const statusBadge = card.locator('[data-testid="repository-status-badge"]')
    const expected = status === 'active' ? /Active/i : /Inactive/i
    await expect(statusBadge).toContainText(expected, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRepositoriesHeaderCount(count: number): Promise<void> {
    const header = this.repositoriesHeader
    await expect(header).toContainText(`${count}`, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async waitForRepositoryCardToDisappear(name: string): Promise<void> {
    const card = await this.getRepositoryCardByName(name)
    await expect(card).not.toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectRepositoryInactiveStyles(name: string): Promise<void> {
    const card = await this.getRepositoryCardByName(name)
    // Check for reduced opacity or dimmed styling
    const opacity = await card.evaluate((el) => window.getComputedStyle(el).opacity)
    expect(parseFloat(opacity as string)).toBeLessThan(1)
  }

  async expectTestConnectionResult(result: 'success' | 'error'): Promise<void> {
    const selector =
      result === 'success' ? '[data-testid="test-connection-success"]' : '[data-testid="test-connection-error"]'
    const element = this.page.locator(selector)
    await expect(element).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }
}
