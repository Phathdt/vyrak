import { TEST_TIMEOUTS } from '@config/test.config'
import { URLS } from '@config/urls.config'
import { BasePage } from '@page-objects/base.page'
import { expect, type Page } from '@playwright/test'

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Locators - Keep original flexible patterns for stability
  private get welcomeMessage() {
    return this.page.locator('[data-testid="welcome-message"], h1, h2').first()
  }

  private get userInfo() {
    return this.page.locator('[data-testid="user-info"]')
  }

  private get logoutButton() {
    return this.page.getByRole('button', { name: /log ?out|sign ?out/i })
  }

  private get mainContent() {
    return this.page.locator('[data-testid="dashboard-content"], main, .dashboard')
  }

  // Organization selector - Use flexible patterns
  private get orgSelector() {
    return this.page.locator('select[data-testid*="org"], select').first()
  }

  private get orgSelectorSection() {
    return this.page.locator('[data-testid*="org-selector"], [class*="selector"]').first()
  }

  private get orgSelectorSlug() {
    return this.page.locator('[data-testid*="slug"], [class*="slug"]').first()
  }

  // Stats section - Try multiple selectors
  private get statsSection() {
    return this.page.locator('[data-testid*="stats"], [class*="stats"]').first()
  }

  private get statCardOrganizations() {
    return this.page.locator('[data-testid*="organization"], [class*="organizations"]').first()
  }

  private get statCardActiveOrg() {
    return this.page.locator('[data-testid*="active"], [class*="active"]').first()
  }

  private get statCardStatus() {
    return this.page.locator('[data-testid*="status"], [class*="status"]').first()
  }

  private get statCardRole() {
    return this.page.locator('[data-testid*="role"], [class*="role"]').first()
  }

  // Quick actions
  private get quickActionsSection() {
    return this.page.locator('[data-testid*="action"], [class*="action"]').first()
  }

  private get quickActionOrganizations() {
    return this.page.locator('a[href*="organizations"], button[aria-label*="organizations"]').first()
  }

  private get quickActionSettings() {
    return this.page.locator('a[href*="settings"], button[aria-label*="settings"]').first()
  }

  // User info section
  private get userInfoSection() {
    return this.page.locator('[data-testid*="user"], [class*="user-info"]').first()
  }

  private get userInfoId() {
    return this.userInfo.locator('[data-testid*="id"]').first()
  }

  private get userInfoEmail() {
    return this.userInfo.locator('[data-testid*="email"]').first()
  }

  private get userInfoName() {
    return this.userInfo.locator('[data-testid*="name"]').first()
  }

  private get userInfoOrgCount() {
    return this.userInfo.locator('[data-testid*="org-count"]').first()
  }

  // Actions
  async navigate(): Promise<void> {
    await this.goto(URLS.ROUTES.DASHBOARD)
  }

  async clickLogout(): Promise<void> {
    await this.logoutButton.click()
  }

  async getUserEmail(): Promise<string | null> {
    const userInfoText = await this.userInfo.textContent()
    return userInfoText
  }

  async selectOrganization(orgId: string): Promise<void> {
    await this.orgSelector.selectOption(orgId)
    await this.page.waitForLoadState('networkidle')
  }

  async selectOrganizationByIndex(index: number): Promise<void> {
    await this.orgSelector.selectOption({ index })
    await this.page.waitForLoadState('networkidle')
  }

  async getActiveOrgId(): Promise<string> {
    return await this.orgSelector.inputValue()
  }

  async getOrgSelectorOptions(): Promise<number> {
    return await this.page.locator('select option').count()
  }

  async getStatCardText(statType: 'organizations' | 'activeOrg' | 'status' | 'role'): Promise<string | null> {
    let card
    switch (statType) {
      case 'organizations':
        card = this.statCardOrganizations
        break
      case 'activeOrg':
        card = this.statCardActiveOrg
        break
      case 'status':
        card = this.statCardStatus
        break
      case 'role':
        card = this.statCardRole
        break
    }
    return await card.textContent()
  }

  async getUserInfoText(field: 'id' | 'email' | 'name' | 'orgCount'): Promise<string | null> {
    let element
    switch (field) {
      case 'id':
        element = this.userInfoId
        break
      case 'email':
        element = this.userInfoEmail
        break
      case 'name':
        element = this.userInfoName
        break
      case 'orgCount':
        element = this.userInfoOrgCount
        break
    }
    return await element.textContent()
  }

  async reload(): Promise<void> {
    await this.page.reload()
    await this.page.waitForLoadState('networkidle')
  }

  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  // Assertions
  async expectOnDashboard(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: TEST_TIMEOUTS.NAVIGATION })
  }

  async expectWelcomeMessageVisible(): Promise<void> {
    await expect(this.welcomeMessage).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectUserInfoVisible(): Promise<void> {
    await expect(this.userInfo).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectMainContentVisible(): Promise<void> {
    await expect(this.mainContent).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectLogoutButtonVisible(): Promise<void> {
    await expect(this.logoutButton).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStatsSectionVisible(): Promise<void> {
    await expect(this.statsSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectStatCardVisible(statType: 'organizations' | 'activeOrg' | 'status' | 'role'): Promise<void> {
    let card
    switch (statType) {
      case 'organizations':
        card = this.statCardOrganizations
        break
      case 'activeOrg':
        card = this.statCardActiveOrg
        break
      case 'status':
        card = this.statCardStatus
        break
      case 'role':
        card = this.statCardRole
        break
    }
    await expect(card).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectOrgSelectorSectionVisible(): Promise<void> {
    await expect(this.orgSelectorSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectOrgSelectorVisible(): Promise<void> {
    await expect(this.orgSelector).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectOrgSelectorSlugVisible(): Promise<void> {
    await expect(this.orgSelectorSlug).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectQuickActionsVisible(): Promise<void> {
    await expect(this.quickActionsSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectQuickActionOrganizationsVisible(): Promise<void> {
    await expect(this.quickActionOrganizations).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectQuickActionSettingsVisible(): Promise<void> {
    await expect(this.quickActionSettings).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectUserInfoSectionVisible(): Promise<void> {
    await expect(this.userInfoSection).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectUserInfoFieldVisible(field: 'id' | 'email' | 'name' | 'orgCount'): Promise<void> {
    let element
    switch (field) {
      case 'id':
        element = this.userInfoId
        break
      case 'email':
        element = this.userInfoEmail
        break
      case 'name':
        element = this.userInfoName
        break
      case 'orgCount':
        element = this.userInfoOrgCount
        break
    }
    await expect(element).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }

  async expectOrgOptionExists(orgId: string): Promise<void> {
    const option = this.page.locator(`select option[value="${orgId}"]`)
    await expect(option).toBeVisible({ timeout: TEST_TIMEOUTS.ACTION })
  }
}
