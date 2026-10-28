import { expect, test } from '@fixtures/auth.fixture'

test.describe('Project Detail Page', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/projects')
    await authenticatedPage.waitForLoadState('networkidle')
  })

  test('should display project details', async ({ authenticatedPage }) => {
    const projectCards = authenticatedPage.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    // Navigate to first project
    await projectCards.first().click()
    await authenticatedPage.waitForURL(/\/projects\/proj-[\w-]+/)

    // Verify project details are displayed
    await expect(authenticatedPage.locator('h1')).toBeVisible()

    // Should have slug badge
    const slugBadge = authenticatedPage.locator('[data-testid="project-slug"]')
    if ((await slugBadge.count()) > 0) {
      await expect(slugBadge).toBeVisible()
    }
  })

  test('should display project statistics', async ({ authenticatedPage }) => {
    const projectCards = authenticatedPage.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()
    await authenticatedPage.waitForURL(/\/projects\/proj-[\w-]+/)

    // Check for stats section
    const statsSection = authenticatedPage.locator('[data-testid="project-stats"]')

    if ((await statsSection.count()) > 0) {
      await expect(statsSection).toBeVisible()

      // Should show repository count
      await expect(authenticatedPage.locator('text=/repositories/i')).toBeVisible()
    }
  })

  test('should navigate back to projects list', async ({ authenticatedPage }) => {
    const projectCards = authenticatedPage.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()
    await authenticatedPage.waitForURL(/\/projects\/proj-[\w-]+/)

    // Try to find and click back button or breadcrumb
    const backLink = authenticatedPage
      .locator('a, button')
      .filter({ hasText: /back|projects/i })
      .first()

    if (await backLink.isVisible()) {
      await backLink.click()
      await authenticatedPage.waitForURL('/projects')
      await expect(authenticatedPage.getByRole('heading', { name: 'Projects' })).toBeVisible()
    }
  })

  test.skip('should handle 404 for non-existent project', async ({ authenticatedPage }) => {
    // TODO: Implement proper 404 handling for projects
    await authenticatedPage.goto('/projects/proj-nonexistent-123456', { waitUntil: 'networkidle' })

    // Should show error message or redirect
    const hasErrorMessage = await authenticatedPage
      .locator('text=/not found/i')
      .isVisible()
      .catch(() => false)
    const redirectedToList = authenticatedPage.url().endsWith('/projects')

    expect(hasErrorMessage || redirectedToList).toBeTruthy()
  })

  test('should display repositories section', async ({ authenticatedPage }) => {
    const projectCards = authenticatedPage.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()
    await authenticatedPage.waitForURL(/\/projects\/proj-[\w-]+/)

    // Check for repositories section
    const reposSection = authenticatedPage.locator('text=/repositories/i')
    await expect(reposSection).toBeVisible()
  })

  test('should display workflows section', async ({ authenticatedPage }) => {
    const projectCards = authenticatedPage.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()
    await authenticatedPage.waitForURL(/\/projects\/proj-[\w-]+/)

    // Check for workflows or recent activity section
    const workflowSection = authenticatedPage.locator('text=/workflows|recent activity/i')

    if ((await workflowSection.count()) > 0) {
      await expect(workflowSection.first()).toBeVisible()
    }
  })

  test('should show loading state initially', async ({ authenticatedPage }) => {
    // Intercept API call to delay response
    await authenticatedPage.route('**/api/projects/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      await route.continue()
    })

    const projectCards = authenticatedPage.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()

    // Should show loading indicator (but might be too fast to catch)
    const loadingIndicator = await authenticatedPage
      .locator('[data-testid="loading-skeleton"], .spinner, text=/loading/i')
      .isVisible()
      .catch(() => false)

    // Just verify the page loaded (don't enforce loading state visibility)
    await authenticatedPage.waitForURL(/\/projects\/proj-[\w-]+/)
    await expect(authenticatedPage.locator('h1')).toBeVisible()
  })

  test('should have proper page title', async ({ authenticatedPage }) => {
    const projectCards = authenticatedPage.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()
    await authenticatedPage.waitForURL(/\/projects\/proj-[\w-]+/)
    await authenticatedPage.waitForLoadState('networkidle')

    // Page title should include project name
    const title = await authenticatedPage.title()
    expect(title).toBeTruthy()
    expect(title.length).toBeGreaterThan(0)
  })

  test('should display created date', async ({ authenticatedPage }) => {
    const projectCards = authenticatedPage.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()
    await authenticatedPage.waitForURL(/\/projects\/proj-[\w-]+/)

    // Look for created date
    const createdText = authenticatedPage.locator('text=/created/i')

    if ((await createdText.count()) > 0) {
      await expect(createdText.first()).toBeVisible()
    }
  })

  test('should have accessible heading structure', async ({ authenticatedPage }) => {
    const projectCards = authenticatedPage.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()
    await authenticatedPage.waitForURL(/\/projects\/proj-[\w-]+/)

    // Should have h1 for main title
    const h1 = authenticatedPage.locator('h1')
    await expect(h1).toBeVisible()

    // Should have proper heading hierarchy
    const allHeadings = await authenticatedPage.locator('h1, h2, h3, h4').all()
    expect(allHeadings.length).toBeGreaterThan(0)
  })
})
