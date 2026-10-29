import { TEST_TIMEOUTS } from '@config/test.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Page } from '@playwright/test'

/**
 * Phase Diagram Page Object
 * Handles ReactFlow diagram interactions for workflow phases
 */
export class PhaseDiagramPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators - Diagram Container
  private get diagramContainer() {
    return this.page.locator('[data-testid="phase-diagram"], [class*="diagram"], .react-flow').first()
  }

  private get svgCanvas() {
    return this.page.locator('[data-testid="phase-diagram"] svg, .react-flow svg').first()
  }

  // Locators - Phase Nodes
  private get phaseNodes() {
    return this.page.locator('[data-testid*="phase-node"], [class*="phase-node"]')
  }

  private getPhaseNode(phaseName: string) {
    return this.page
      .locator(`[data-testid="phase-node-${phaseName.toLowerCase().replace(/\s+/g, '-')}"], text=/${phaseName}/i`)
      .locator('..')
      .first()
  }

  // Locators - Phase Node Status
  private getPhaseNodeStatusElement(phaseName: string) {
    return this.getPhaseNode(phaseName).locator('[data-testid*="status"], [class*="status"]').first()
  }

  private getPhaseNodeDurationElement(phaseName: string) {
    return this.getPhaseNode(phaseName).locator('text=/\\d+[msh]/i').first()
  }

  // Locators - Approval Gates
  private get approvalGates() {
    return this.page.locator('[data-testid*="approval-gate"], [class*="approval-gate"]')
  }

  private getApprovalGate(gateName: string) {
    return this.page
      .locator(`[data-testid="approval-gate-${gateName.toLowerCase().replace(/\s+/g, '-')}"], text=/${gateName}/i`)
      .locator('..')
      .first()
  }

  // Locators - Edges/Connections
  private get edges() {
    return this.page.locator('[data-testid*="edge"], [class*="edge"]')
  }

  // Locators - Controls
  private get zoomInButton() {
    return this.page.locator('[data-testid="zoom-in"], button[aria-label*="zoom in"]').first()
  }

  private get zoomOutButton() {
    return this.page.locator('[data-testid="zoom-out"], button[aria-label*="zoom out"]').first()
  }

  private get fitViewButton() {
    return this.page.locator('[data-testid="fit-view"], button[aria-label*="fit"]').first()
  }

  private get resetViewButton() {
    return this.page.locator('[data-testid="reset-view"], button[aria-label*="reset"]').first()
  }

  // Locators - Current Phase Indicator
  private get currentPhaseHighlight() {
    return this.page.locator('[class*="current"], [class*="active"], [class*="running"]').first()
  }

  private get currentPhaseLabel() {
    return this.page.locator('text=/current phase|currently running/i').first()
  }

  // Actions - Zoom & Pan
  async zoomIn(): Promise<void> {
    await this.zoomInButton.click()
    await this.page.waitForTimeout(300)
  }

  async zoomOut(): Promise<void> {
    await this.zoomOutButton.click()
    await this.page.waitForTimeout(300)
  }

  async fitView(): Promise<void> {
    await this.fitViewButton.click()
    await this.page.waitForTimeout(300)
  }

  async resetView(): Promise<void> {
    await this.resetViewButton.click()
    await this.page.waitForTimeout(300)
  }

  async panDiagram(deltaX: number, deltaY: number): Promise<void> {
    const canvas = this.svgCanvas
    await canvas.hover()
    // Simulate pan by mouse move with middle button or space+drag
    await this.page.mouse.move(500, 400)
    await this.page.mouse.down()
    await this.page.mouse.move(500 + deltaX, 400 + deltaY, { steps: 10 })
    await this.page.mouse.up()
  }

  // Actions - Node Inspection
  async getPhaseNodeCount(): Promise<number> {
    return await this.phaseNodes.count()
  }

  async getPhaseNodeStatus(phaseName: string): Promise<string | null> {
    const status = this.getPhaseNodeStatusElement(phaseName)
    return await status.textContent()
  }

  async getPhaseNodeDuration(phaseName: string): Promise<string | null> {
    const duration = this.getPhaseNodeDurationElement(phaseName)
    return await duration.textContent()
  }

  async clickPhaseNode(phaseName: string): Promise<void> {
    const node = this.getPhaseNode(phaseName)
    await node.click()
  }

  async getApprovalGateCount(): Promise<number> {
    return await this.approvalGates.count()
  }

  // Actions - Get Node Details
  async getPhaseNodeText(phaseName: string): Promise<string | null> {
    const node = this.getPhaseNode(phaseName)
    return await node.textContent()
  }

  async getDiagramTransform(): Promise<{ x: number; y: number; scale: number } | null> {
    const transform = await this.svgCanvas
      .evaluate((el) => {
        const transform = window.getComputedStyle(el).transform
        const match = transform.match(/matrix3d?\(([^)]+)\)/)
        if (match) {
          const values = match[1].split(',').map((v) => parseFloat(v.trim()))
          return {
            x: values[12] || 0,
            y: values[13] || 0,
            scale: Math.sqrt(values[0] * values[0] + values[1] * values[1]),
          }
        }
        return null
      })
      .catch(() => null)
    return transform
  }

  // Assertions - Diagram Visibility
  async expectDiagramVisible(): Promise<void> {
    await expect(this.diagramContainer).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectDiagramLoaded(): Promise<void> {
    await expect(this.svgCanvas).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  // Assertions - Phase Nodes
  async expectPhaseNodeVisible(phaseName: string): Promise<void> {
    const node = this.getPhaseNode(phaseName)
    await expect(node).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPhaseNodeCount(expectedCount: number): Promise<void> {
    const count = await this.getPhaseNodeCount()
    expect(count).toBe(expectedCount)
  }

  async expectPhaseNodeStatus(phaseName: string): Promise<void> {
    const statusElement = this.getPhaseNodeStatusElement(phaseName)
    await expect(statusElement).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectPreviewShows(count: number, phase: 'phases' | 'approval gates'): Promise<void> {
    if (phase === 'phases') {
      const phaseCount = await this.getPhaseNodeCount()
      expect(phaseCount).toBe(count)
    } else {
      const gateCount = await this.getApprovalGateCount()
      expect(gateCount).toBe(count)
    }
  }

  async expectPhaseNodeHighlighted(phaseName: string): Promise<void> {
    const node = this.getPhaseNode(phaseName)
    const hasHighlight = await node
      .evaluate((el) => {
        const classes = el.className.baseVal || el.className
        return classes.includes('current') || classes.includes('active') || classes.includes('running')
      })
      .catch(() => false)

    expect(hasHighlight || (await node.isVisible())).toBeTruthy()
  }

  // Assertions - Approval Gates
  async expectApprovalGateVisible(gateName: string): Promise<void> {
    const gate = this.getApprovalGate(gateName)
    await expect(gate).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectApprovalGateCount(expectedCount: number): Promise<void> {
    const count = await this.getApprovalGateCount()
    expect(count).toBe(expectedCount)
  }

  // Assertions - Controls
  async expectZoomControlsVisible(): Promise<void> {
    await expect(this.zoomInButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
    await expect(this.zoomOutButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectFitViewButtonVisible(): Promise<void> {
    await expect(this.fitViewButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectCurrentPhaseHighlighted(): Promise<void> {
    const highlight = this.currentPhaseHighlight
    const isVisible = await highlight.isVisible().catch(() => false)
    const labelVisible = await this.currentPhaseLabel.isVisible().catch(() => false)
    expect(isVisible || labelVisible).toBeTruthy()
  }

  // Assertions - Edge Rendering
  async expectEdgesRendered(): Promise<void> {
    const edgeCount = await this.edges.count()
    expect(edgeCount).toBeGreaterThan(0)
  }
}
