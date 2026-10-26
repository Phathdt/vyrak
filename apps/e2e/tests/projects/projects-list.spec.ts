import { expect, test } from '@playwright/test'

test.describe('Projects Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to projects page (assumes user is already logged in via global setup)
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
  })

  test('should display projects list', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Projects')

    // Should have at least the "Create Project" button
    await expect(page.getByRole('button', { name: /create project/i })).toBeVisible()
  })

  test('should create a new project', async ({ page }) => {
    // Open create modal
    await page.click('button:has-text("Create Project")')
    await expect(page.locator('text=Create New Project')).toBeVisible()

    // Fill form
    await page.fill('input[name="name"]', 'E2E Test Project')

    // Wait for slug auto-generation
    await page.waitForTimeout(200)

    const slugInput = page.locator('input[name="slug"]')
    await expect(slugInput).toHaveValue('e2e-test-project')

    await page.fill('textarea[name="description"]', 'Created by E2E test')

    // Submit
    await page.click('button[type="submit"]:has-text("Create")')

    // Should redirect to detail page or show success
    await page.waitForTimeout(1000)

    // Verify success (either redirected to detail or see success toast)
    const url = page.url()
    const isDetailPage = url.includes('/projects/proj-')
    const hasSuccessToast = await page
      .locator('text=/created successfully/i')
      .isVisible()
      .catch(() => false)

    expect(isDetailPage || hasSuccessToast).toBeTruthy()
  })

  test('should search projects', async ({ page }) => {
    // Ensure we have at least one project
    const projectCards = page.locator('[data-testid="project-card"]')
    const initialCount = await projectCards.count()

    if (initialCount === 0) {
      test.skip()
    }

    // Type in search
    await page.fill('input[placeholder*="Search projects"]', 'nonexistent')

    // Wait for debounce
    await page.waitForTimeout(400)

    // Should show empty state or no results
    const noResultsVisible = await page
      .locator('text=/no projects found/i')
      .isVisible()
      .catch(() => false)
    const emptyStateVisible = await page
      .locator('text=/no projects/i')
      .isVisible()
      .catch(() => false)

    expect(noResultsVisible || emptyStateVisible).toBeTruthy()
  })

  test('should sort projects', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count < 2) {
      test.skip()
    }

    // Change sort to Name A-Z
    await page.selectOption('select[aria-label*="Sort"]', 'name')

    // Wait for results
    await page.waitForTimeout(500)

    // Verify sort option is selected
    const sortSelect = page.locator('select[aria-label*="Sort"]')
    const selectedValue = await sortSelect.inputValue()
    expect(selectedValue).toBe('name')
  })

  test('should view project details', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    // Click on first project card
    await projectCards.first().click()

    // Should navigate to detail page
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Verify details displayed
    await expect(page.locator('h1')).toBeVisible()
  })

  test('should validate form fields', async ({ page }) => {
    // Open create modal
    await page.click('button:has-text("Create Project")')

    // Try to submit empty form
    await page.click('button[type="submit"]:has-text("Create")')

    // Should show validation errors
    await expect(page.locator('text=/required/i').first()).toBeVisible()
  })

  test('should clear search', async ({ page }) => {
    // Type search
    await page.fill('input[placeholder*="Search projects"]', 'test')
    await page.waitForTimeout(400)

    // Clear search using clear button
    const clearButton = page.locator('button[aria-label*="Clear"]')

    if (await clearButton.isVisible()) {
      await clearButton.click()

      // Search input should be empty
      const searchInput = page.locator('input[placeholder*="Search projects"]')
      await expect(searchInput).toHaveValue('')
    }
  })

  test('should handle keyboard navigation', async ({ page }) => {
    // Tab to search input
    await page.keyboard.press('Tab')

    const searchInput = page.locator('input[placeholder*="Search projects"]')

    // Check if focused using Playwright's expect
    await expect(searchInput).toBeFocused()
  })

  test('should display empty state when no projects', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count > 0) {
      // Apply search that returns no results
      await page.fill('input[placeholder*="Search projects"]', 'zzz-nonexistent-xyz-123')
      await page.waitForTimeout(400)
    }

    // Should show some empty state message
    const emptyMessages = ['No projects found', 'No projects', 'Create your first project', 'Get started']

    let foundEmptyState = false
    for (const message of emptyMessages) {
      if (
        await page
          .locator(`text=/${message}/i`)
          .isVisible()
          .catch(() => false)
      ) {
        foundEmptyState = true
        break
      }
    }

    expect(foundEmptyState).toBeTruthy()
  })

  test('should close modal on escape key', async ({ page }) => {
    // Open create modal
    await page.click('button:has-text("Create Project")')
    await expect(page.locator('text=Create New Project')).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')

    // Modal should close
    await expect(page.locator('text=Create New Project')).not.toBeVisible()
  })
})
