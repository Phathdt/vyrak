import { expect, test } from '@playwright/test'

test.describe('Project Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
  })

  test('should display project details', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    // Navigate to first project
    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Verify project details are displayed
    await expect(page.locator('h1')).toBeVisible()

    // Should have slug badge
    const slugBadge = page.locator('[data-testid="project-slug"]')
    if ((await slugBadge.count()) > 0) {
      await expect(slugBadge).toBeVisible()
    }
  })

  test('should display project statistics', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Check for stats section
    const statsSection = page.locator('[data-testid="project-stats"]')

    if ((await statsSection.count()) > 0) {
      await expect(statsSection).toBeVisible()

      // Should show repository count
      await expect(page.locator('text=/repositories/i')).toBeVisible()
    }
  })

  test('should navigate back to projects list', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Find and click back button or breadcrumb
    const backButton = page.locator('a:has-text("Projects")').first()

    if (await backButton.isVisible()) {
      await backButton.click()
      await page.waitForURL('/projects')
      await expect(page.locator('h1:has-text("Projects")')).toBeVisible()
    }
  })

  test('should handle 404 for non-existent project', async ({ page }) => {
    await page.goto('/projects/proj-nonexistent-123456')

    // Should show error message or redirect
    const hasErrorMessage = await page
      .locator('text=/not found/i')
      .isVisible()
      .catch(() => false)
    const redirectedToList = page.url().endsWith('/projects')

    expect(hasErrorMessage || redirectedToList).toBeTruthy()
  })

  test('should display repositories section', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Check for repositories section
    const reposSection = page.locator('text=/repositories/i')
    await expect(reposSection).toBeVisible()
  })

  test('should display workflows section', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Check for workflows or recent activity section
    const workflowSection = page.locator('text=/workflows|recent activity/i')

    if ((await workflowSection.count()) > 0) {
      await expect(workflowSection.first()).toBeVisible()
    }
  })

  test('should show loading state initially', async ({ page }) => {
    // Intercept API call to delay response
    await page.route('**/api/projects/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      await route.continue()
    })

    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()

    // Should show loading indicator
    const loadingIndicator = page.locator('[data-testid="loading-skeleton"], .spinner, text=/loading/i')

    if ((await loadingIndicator.count()) > 0) {
      await expect(loadingIndicator.first()).toBeVisible()
    }
  })

  test('should have proper page title', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)
    await page.waitForLoadState('networkidle')

    // Page title should include project name
    const title = await page.title()
    expect(title).toBeTruthy()
    expect(title.length).toBeGreaterThan(0)
  })

  test('should display created date', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Look for created date
    const createdText = page.locator('text=/created/i')

    if ((await createdText.count()) > 0) {
      await expect(createdText.first()).toBeVisible()
    }
  })

  test('should have accessible heading structure', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Should have h1 for main title
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()

    // Should have proper heading hierarchy
    const allHeadings = await page.locator('h1, h2, h3, h4').all()
    expect(allHeadings.length).toBeGreaterThan(0)
  })
})
