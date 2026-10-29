import { TEST_TIMEOUTS } from '@config/test.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Page } from '@playwright/test'

export class ArtifactViewerPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators - Modal
  private get viewerModal() {
    return this.getPage().locator('[role="dialog"], [class*="modal"], [data-testid*="artifact-viewer"]').first()
  }

  private get modalTitle() {
    return this.viewerModal.locator('h2, h3').first()
  }

  private get closeButton() {
    return this.viewerModal
      .locator('button[aria-label*="Close"], button:has-text("✕"), button[aria-label*="close"]')
      .first()
  }

  // Locators - Content Area
  private get contentContainer() {
    return this.viewerModal.locator('[class*="content"], [data-testid*="content"]').first()
  }

  // Locators - Markdown Content
  get markdownContent() {
    return this.contentContainer.locator('[class*="markdown"], [data-testid*="markdown"]')
  }

  private get markdownHeadings() {
    return this.markdownContent.locator('h1, h2, h3, h4, h5, h6')
  }

  private get markdownTableOfContents() {
    return this.markdownContent.locator('[class*="toc"], nav')
  }

  // Locators - Code Content
  private get codeContent() {
    return this.contentContainer.locator('pre, code, [class*="code"], [class*="hljs"], [data-testid*="code"]')
  }

  private get codeLineNumbers() {
    return this.codeContent.locator('[class*="line-number"], [data-line-number]')
  }

  private get copyCodeButton() {
    return this.viewerModal.getByRole('button', { name: /copy|copy code/i })
  }

  get downloadButton() {
    return this.viewerModal.getByRole('button', { name: /download/i })
  }

  // Locators - JSON Content
  private get jsonViewer() {
    return this.contentContainer.locator('[class*="json"], [data-testid*="json"]')
  }

  private get jsonTreeNodes() {
    return this.jsonViewer.locator('[class*="tree-node"], [class*="json-node"]')
  }

  private get jsonCollapseButtons() {
    return this.jsonViewer.locator('button[class*="collapse"], [class*="expand-button"]')
  }

  // Locators - Text/Log Content
  private get textContent() {
    return this.contentContainer.locator('code, pre, [class*="monospace"], [data-testid*="text"]')
  }

  private get logSearchBox() {
    return this.viewerModal.locator('input[placeholder*="Search"], [data-testid*="search"]')
  }

  private get textWrapToggle() {
    return this.viewerModal.getByRole('button', { name: /wrap|nowrap/i })
  }

  // Locators - Navigation
  get previousButton() {
    return this.viewerModal.getByRole('button', { name: /previous|prev|<|‹/i })
  }

  get nextButton() {
    return this.viewerModal.getByRole('button', { name: /next|next|>|›/i })
  }

  private get artifactCounter() {
    return this.viewerModal.locator('text=/\\d+\\s*of\\s*\\d+/')
  }

  // Locators - Metadata
  private get artifactMetadata() {
    return this.viewerModal.locator('[class*="metadata"], [data-testid*="metadata"]')
  }

  private get artifactSize() {
    return this.artifactMetadata.locator('text=/\\d+\\s*(B|KB|MB)/')
  }

  private get artifactType() {
    return this.artifactMetadata.locator('[data-testid*="type"], text=/markdown|code|json|text|log/i')
  }

  // Actions - Close Modal
  async closeViewer(): Promise<void> {
    await this.closeButton.click()
  }

  async closeViewerWithEsc(): Promise<void> {
    await this.getPage().keyboard.press('Escape')
  }

  // Actions - Navigation
  async clickNext(): Promise<void> {
    await this.nextButton.click()
    await this.getPage().waitForTimeout(300)
  }

  async clickPrevious(): Promise<void> {
    await this.previousButton.click()
    await this.getPage().waitForTimeout(300)
  }

  // Actions - Copy/Download
  async copyContent(): Promise<void> {
    await this.copyCodeButton.click()
  }

  async downloadArtifact(): Promise<void> {
    await this.downloadButton.click()
  }

  // Actions - Search in Log
  async searchInLog(query: string): Promise<void> {
    await this.logSearchBox.fill(query)
  }

  // Actions - Text Wrapping
  async toggleTextWrap(): Promise<void> {
    await this.textWrapToggle.click()
  }

  // Actions - JSON Expand/Collapse
  async expandJsonNode(index: number): Promise<void> {
    const buttons = this.jsonCollapseButtons
    await buttons.nth(index).click()
  }

  async expandAllJsonNodes(): Promise<void> {
    const buttons = this.jsonCollapseButtons
    const count = await buttons.count()
    for (let i = 0; i < count; i++) {
      await buttons.nth(i).click()
      await this.getPage().waitForTimeout(50)
    }
  }

  // Actions - Get Information
  async getArtifactTitle(): Promise<string | null> {
    return await this.modalTitle.textContent()
  }

  async getContentAsText(): Promise<string | null> {
    return await this.contentContainer.textContent()
  }

  async getArtifactSize(): Promise<string | null> {
    return await this.artifactSize.textContent()
  }

  async getArtifactType(): Promise<string | null> {
    return await this.artifactType.textContent()
  }

  async getArtifactCounter(): Promise<string | null> {
    return await this.artifactCounter.textContent()
  }

  async getMarkdownHeadingCount(): Promise<number> {
    return await this.markdownHeadings.count()
  }

  async getCodeLineCount(): Promise<number> {
    return await this.codeLineNumbers.count()
  }

  async getJsonNodeCount(): Promise<number> {
    return await this.jsonTreeNodes.count()
  }

  // Assertions - Modal State
  async expectViewerOpen(): Promise<void> {
    await expect(this.viewerModal).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectViewerClosed(): Promise<void> {
    await expect(this.viewerModal).not.toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectTitleVisible(title?: string | RegExp): Promise<void> {
    await expect(this.modalTitle).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    if (title) {
      await expect(this.modalTitle).toContainText(title)
    }
  }

  // Assertions - Content Type
  async expectMarkdownContent(): Promise<void> {
    await expect(this.markdownContent).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectMarkdownHasHeadings(): Promise<void> {
    const count = await this.getMarkdownHeadingCount()
    expect(count).toBeGreaterThan(0)
  }

  async expectMarkdownHasTableOfContents(): Promise<void> {
    await expect(this.markdownTableOfContents).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectCodeContent(): Promise<void> {
    await expect(this.codeContent).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectCodeHasLineNumbers(): Promise<void> {
    const count = await this.getCodeLineCount()
    expect(count).toBeGreaterThan(0)
  }

  async expectJsonContent(): Promise<void> {
    await expect(this.jsonViewer).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectJsonHasNodes(): Promise<void> {
    const count = await this.getJsonNodeCount()
    expect(count).toBeGreaterThan(0)
  }

  async expectTextContent(): Promise<void> {
    await expect(this.textContent).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Actions
  async expectCopyButtonVisible(): Promise<void> {
    await expect(this.copyCodeButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectDownloadButtonVisible(): Promise<void> {
    await expect(this.downloadButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPreviousButtonVisible(): Promise<void> {
    await expect(this.previousButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectNextButtonVisible(): Promise<void> {
    await expect(this.nextButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPreviousButtonDisabled(): Promise<void> {
    await expect(this.previousButton).toBeDisabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectNextButtonDisabled(): Promise<void> {
    await expect(this.nextButton).toBeDisabled({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectArtifactCounterVisible(): Promise<void> {
    await expect(this.artifactCounter).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectMetadataVisible(): Promise<void> {
    await expect(this.artifactMetadata).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }
}
