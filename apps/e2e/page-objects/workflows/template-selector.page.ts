import { TEST_TIMEOUTS } from '@config/test.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Page } from '@playwright/test'

/**
 * Template Selector Page Object
 * Handles template selection interactions for workflow creation
 */
export class TemplateSelectorPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators - Template Cards
  private get templateCards() {
    return this.page.locator('[data-testid*="template-card"], [class*="template-card"]')
  }

  private getTemplateCard(templateName: 'Feature' | 'Hotfix' | 'Spike') {
    return this.page
      .locator(`[data-testid="template-card-${templateName.toLowerCase()}"], text=/${templateName}/i`)
      .locator('..')
      .first()
  }

  private getTemplateCardIcon(templateName: 'Feature' | 'Hotfix' | 'Spike') {
    return this.getTemplateCard(templateName).locator('svg, [class*="icon"]').first()
  }

  private getTemplateCardName(templateName: 'Feature' | 'Hotfix' | 'Spike') {
    return this.getTemplateCard(templateName).locator('[class*="name"], [class*="title"], h3, h4').first()
  }

  private getTemplateCardDescription(templateName: 'Feature' | 'Hotfix' | 'Spike') {
    return this.getTemplateCard(templateName).locator('[class*="description"], p').first()
  }

  private getTemplateCardDuration(templateName: 'Feature' | 'Hotfix' | 'Spike') {
    return this.getTemplateCard(templateName).locator('text=/duration|hours|mins/i').first()
  }

  // Locators - Template Preview
  private get templatePreview() {
    return this.page.locator('[data-testid="template-preview"], [class*="preview"]').first()
  }

  private get previewTitle() {
    return this.templatePreview.locator('h2, h3').first()
  }

  private get previewPhasesList() {
    return this.templatePreview.locator('[data-testid*="phase"], [class*="phase"]')
  }

  private get approvalGatesList() {
    return this.templatePreview.locator('[data-testid*="approval"], [class*="approval"]')
  }

  private get previewCloseButton() {
    return this.templatePreview.locator('button[aria-label*="close"], button:has-text("✕")').first()
  }

  // Actions - Template Selection
  async selectTemplate(templateName: 'Feature' | 'Hotfix' | 'Spike'): Promise<void> {
    const card = this.getTemplateCard(templateName)
    await card.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ACTION })
    await card.click()
    // Wait for preview to expand or form update
    await this.page.waitForTimeout(300)
  }

  // Actions - Template Inspection
  async getTemplateCount(): Promise<number> {
    return await this.templateCards.count()
  }

  async getTemplateName(templateName: 'Feature' | 'Hotfix' | 'Spike'): Promise<string | null> {
    return await this.getTemplateCardName(templateName).textContent()
  }

  async getTemplateDescription(templateName: 'Feature' | 'Hotfix' | 'Spike'): Promise<string | null> {
    return await this.getTemplateCardDescription(templateName).textContent()
  }

  async getTemplateDuration(templateName: 'Feature' | 'Hotfix' | 'Spike'): Promise<string | null> {
    return await this.getTemplateCardDuration(templateName).textContent()
  }

  async getPreviewPhaseCount(): Promise<number> {
    return await this.previewPhasesList.count()
  }

  async getApprovalGateCount(): Promise<number> {
    return await this.approvalGatesList.count()
  }

  async closePreview(): Promise<void> {
    const closeButton = this.previewCloseButton
    const isVisible = await closeButton.isVisible().catch(() => false)
    if (isVisible) {
      await closeButton.click()
    }
  }

  // Assertions - Template Card Visibility
  async expectTemplateCardVisible(templateName: 'Feature' | 'Hotfix' | 'Spike'): Promise<void> {
    const card = this.getTemplateCard(templateName)
    await expect(card).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectTemplateCardIconVisible(templateName: 'Feature' | 'Hotfix' | 'Spike'): Promise<void> {
    const icon = this.getTemplateCardIcon(templateName)
    await expect(icon).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectTemplateCardHasName(templateName: 'Feature' | 'Hotfix' | 'Spike'): Promise<void> {
    const name = this.getTemplateCardName(templateName)
    await expect(name).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectTemplateCardHasDescription(templateName: 'Feature' | 'Hotfix' | 'Spike'): Promise<void> {
    const description = this.getTemplateCardDescription(templateName)
    await expect(description).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectTemplateCardHasDuration(templateName: 'Feature' | 'Hotfix' | 'Spike'): Promise<void> {
    const duration = this.getTemplateCardDuration(templateName)
    await expect(duration).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectAllTemplatesVisible(): Promise<void> {
    await this.expectTemplateCardVisible('Feature')
    await this.expectTemplateCardVisible('Hotfix')
    await this.expectTemplateCardVisible('Spike')
  }

  // Assertions - Preview State
  async expectPreviewExpanded(templateName: 'Feature' | 'Hotfix' | 'Spike'): Promise<void> {
    await expect(this.templatePreview).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    const title = this.previewTitle
    await expect(title).toContainText(templateName, { timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPreviewShows(count: number, phase: 'phases' | 'approval gates'): Promise<void> {
    if (phase === 'phases') {
      const phaseCount = await this.getPreviewPhaseCount()
      expect(phaseCount).toBe(count)
    } else {
      const gateCount = await this.getApprovalGateCount()
      expect(gateCount).toBe(count)
    }
  }

  // Assertions - Template Form Updates
  async expectTemplateFormFieldSet(fieldName: string, expectation: 'visible' | 'hidden'): Promise<void> {
    const field = this.page.locator(
      `[name="${fieldName}"], input[placeholder*="${fieldName}"], label:has-text("${fieldName}")`
    )
    if (expectation === 'visible') {
      await expect(field).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    } else {
      await expect(field).not.toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    }
  }

  async expectTemplateSelected(templateName: 'Feature' | 'Hotfix' | 'Spike'): Promise<void> {
    const card = this.getTemplateCard(templateName)
    // Check for selected state (could be class, attribute, or visual indicator)
    const hasSelectedClass = await card
      .evaluate((el) => {
        return el.classList.contains('selected') || el.classList.contains('active')
      })
      .catch(() => false)

    if (!hasSelectedClass) {
      // Check for visual indicator like border or background color
      await expect(card).toHaveClass(/selected|active/)
    }
  }
}
