import { TEST_TIMEOUTS } from '@config/test.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Locator, type Page } from '@playwright/test'

export class ArtifactsListPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators - Artifacts Tab & Header
  private get artifactsTab() {
    return this.getPage().getByRole('tab', { name: /artifacts/i })
  }

  private get artifactsEmptyState() {
    return this.getPage().locator('text=/no artifacts|no artifacts generated/i')
  }

  private get artifactsContainer() {
    return this.getPage().locator('[data-testid*="artifacts"], [class*="artifacts"]').first()
  }

  // Locators - Phase Groups
  private get phaseGroups() {
    return this.getPage().locator('[data-testid*="phase-group"], [class*="phase-group"]')
  }

  private getPhaseGroupByName(phaseName: string) {
    return this.getPage().locator(`text=${phaseName}`).locator('..').locator('..')
  }

  private get phaseGroupHeaders() {
    return this.getPage().locator('[data-testid*="phase-header"], [class*="phase-header"]')
  }

  // Locators - Artifact Cards
  private get artifactCards() {
    return this.getPage().locator('[data-testid*="artifact-card"], [class*="artifact-card"]')
  }

  private getArtifactCardByName(artifactName: string) {
    return this.artifactCards.filter({ hasText: artifactName }).first()
  }

  // Locators - Artifact Metadata
  private artifactName(card: Locator) {
    return card.locator('[data-testid*="artifact-name"], [class*="artifact-name"]')
  }

  private artifactSize(card: Locator) {
    return card.locator('text=/\\d+\\s*(B|KB|MB)/')
  }

  private artifactCreatedDate(card: Locator) {
    return card.locator('[data-testid*="created"], time')
  }

  private artifactBadges(card: Locator) {
    return card.locator('[data-testid*="badge"], [class*="badge"]')
  }

  // Locators - Bulk Actions
  get downloadAllButton() {
    return this.getPage()
      .getByRole('button', { name: /download all|download/i })
      .first()
  }

  // Locators - Story Badges (Feature Template)
  private get templateBadge() {
    return this.getPage().locator('[data-testid*="template-badge"], text=/feature|hotfix|spike/i')
  }

  // Actions - Tab Navigation
  async clickArtifactsTab(): Promise<void> {
    await this.artifactsTab.click()
    await this.getPage().waitForTimeout(500)
  }

  async navigateToArtifactsTab(): Promise<void> {
    await this.clickArtifactsTab()
    await expect(this.artifactsContainer).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Actions - Artifact Selection
  async clickArtifact(artifactName: string): Promise<void> {
    const card = this.getArtifactCardByName(artifactName)
    await card.click()
  }

  async getArtifactCount(): Promise<number> {
    return await this.artifactCards.count()
  }

  async getPhaseGroupCount(): Promise<number> {
    return await this.phaseGroups.count()
  }

  // Actions - Get Metadata
  async getArtifactMetadata(artifactName: string) {
    const card = this.getArtifactCardByName(artifactName)
    return {
      name: await this.artifactName(card).textContent(),
      size: await this.artifactSize(card).textContent(),
      date: await this.artifactCreatedDate(card).getAttribute('datetime'),
      badges: await this.artifactBadges(card).allTextContents(),
    }
  }

  async getPhaseGroupNames(): Promise<string[]> {
    return await this.phaseGroupHeaders.allTextContents()
  }

  async getArtifactsInPhase(phaseName: string): Promise<string[]> {
    const phaseGroup = this.getPhaseGroupByName(phaseName)
    return await phaseGroup.locator('[data-testid*="artifact-card"]').allTextContents()
  }

  // Actions - Bulk Downloads
  async clickDownloadAll(): Promise<void> {
    await this.downloadAllButton.click()
  }

  async clickDownloadPhaseArtifacts(phaseName: string): Promise<void> {
    await this.getPhaseGroupByName(phaseName)
      .locator('button', { hasText: /download/i })
      .click()
  }

  // Actions - Get Template Info
  async getTemplateType(): Promise<string | null> {
    return await this.templateBadge.textContent()
  }

  // Assertions - Page State
  async expectArtifactsTabVisible(): Promise<void> {
    await expect(this.artifactsTab).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectArtifactsLoaded(): Promise<void> {
    await expect(this.artifactsContainer).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.artifactsEmptyState).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectArtifactCount(count: number): Promise<void> {
    const actual = await this.getArtifactCount()
    expect(actual).toBe(count)
  }

  async expectArtifactVisible(artifactName: string): Promise<void> {
    await expect(this.getArtifactCardByName(artifactName)).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPhaseGroupVisible(phaseName: string): Promise<void> {
    await expect(this.getPhaseGroupByName(phaseName)).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPhaseGroupsExist(phaseNames: string[]): Promise<void> {
    for (const phaseName of phaseNames) {
      await this.expectPhaseGroupVisible(phaseName)
    }
  }

  async expectArtifactHasSize(artifactName: string): Promise<void> {
    const card = this.getArtifactCardByName(artifactName)
    const size = this.artifactSize(card)
    await expect(size).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectArtifactHasDate(artifactName: string): Promise<void> {
    const card = this.getArtifactCardByName(artifactName)
    const date = this.artifactCreatedDate(card)
    await expect(date).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectDownloadAllButtonVisible(): Promise<void> {
    await expect(this.downloadAllButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectDownloadAllButtonEnabled(): Promise<void> {
    await expect(this.downloadAllButton).toBeEnabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectTemplateType(template: string): Promise<void> {
    await expect(this.templateBadge).toContainText(template, { timeout: TEST_TIMEOUTS.ACTION })
  }
}
