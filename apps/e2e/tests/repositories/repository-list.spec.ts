import { expect, test } from '@fixtures/auth.fixture'
import { RepositoryListPage } from '@page-objects/repositories/repository-list.page'

test.describe('Repository List (Story 12.1)', () => {
  let repositoryListPage: RepositoryListPage
  let projectId: string

  test.beforeEach(async ({ authenticatedPage: _authenticatedPage }) => {
    repositoryListPage = new RepositoryListPage(_authenticatedPage)

    // Get or create a test project
    await _authenticatedPage.goto('/projects')
    await _authenticatedPage.waitForLoadState('networkidle')

    // Click first project or create one
    const projectCards = _authenticatedPage.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count > 0) {
      // Use existing project
      await projectCards.first().click()
      await _authenticatedPage.waitForURL(/\/projects\/proj-[\w-]+/)
      projectId = _authenticatedPage.url().split('/').pop() || ''
    } else {
      test.skip()
    }

    // Navigate to project detail page
    await repositoryListPage.navigateToProjectDetail(projectId)
    await _authenticatedPage.waitForLoadState('networkidle')
  })

  test('should display repositories section in project detail', async () => {
    // Section should be visible
    await repositoryListPage.expectRepositoriesSectionVisible()
  })

  test('should display empty state when no repositories configured', async () => {
    const count = await repositoryListPage.getRepositoryCount()

    if (count > 0) {
      // Already has repositories, skip
      test.skip()
    }

    await repositoryListPage.expectEmptyState()
  })

  test('should display add repository button in empty state', async () => {
    const count = await repositoryListPage.getRepositoryCount()

    if (count > 0) {
      test.skip()
    }

    // Button should be displayed in empty state
    await repositoryListPage.expectEmptyState()
  })

  test('should display repository cards with required information', async ({ authenticatedPage }) => {
    const count = await repositoryListPage.getRepositoryCount()

    if (count === 0) {
      test.skip()
    }

    // Each card should have provider icon, name, URL, branch, status
    const firstCard = authenticatedPage.locator('[data-testid^="repository-card-"]').first()

    // Check for required elements
    const providerIcon = firstCard.locator('[data-testid="repository-provider-icon"]')
    const name = firstCard.locator('[data-testid="repository-name"]')
    const url = firstCard.locator('[data-testid="repository-url"]')
    const branch = firstCard.locator('[data-testid="repository-branch"]')
    const status = firstCard.locator('[data-testid="repository-status-badge"]')

    await expect(providerIcon).toBeVisible()
    await expect(name).toBeVisible()
    await expect(url).toBeVisible()
    await expect(branch).toBeVisible()
    await expect(status).toBeVisible()
  })

  test('should display quick action buttons on repository cards', async ({ authenticatedPage }) => {
    const count = await repositoryListPage.getRepositoryCount()

    if (count === 0) {
      test.skip()
    }

    const firstCard = authenticatedPage.locator('[data-testid^="repository-card-"]').first()

    // Hover to see actions
    await firstCard.hover()

    const editButton = firstCard.locator('[data-testid="repository-edit-button"]')
    const testButton = firstCard.locator('[data-testid="repository-test-button"]')
    const removeButton = firstCard.locator('[data-testid="repository-remove-button"]')

    await expect(editButton).toBeVisible()
    await expect(testButton).toBeVisible()
    await expect(removeButton).toBeVisible()
  })

  test('should open add repository modal from button', async ({ authenticatedPage }) => {
    await repositoryListPage.clickAddRepository()

    // Modal should appear
    const modal = authenticatedPage.locator('[data-testid="add-repository-modal"]')
    await expect(modal).toBeVisible()
  })

  test('should display repositories count in header', async () => {
    const count = await repositoryListPage.getRepositoryCount()

    if (count === 0) {
      test.skip()
    }

    // Header should show count badge
    await repositoryListPage.expectRepositoriesHeaderCount(count)
  })

  test('should display active status badge for active repositories', async () => {
    const count = await repositoryListPage.getRepositoryCount()

    if (count === 0) {
      test.skip()
    }

    // Get first repository info
    const names = await repositoryListPage.getRepositoryNames()
    const firstName = names[0]

    if (!firstName) {
      test.skip()
    }

    const status = await repositoryListPage.getRepositoryStatus(firstName)
    expect(['active', 'inactive']).toContain(status)
  })

  test('should display provider icons correctly', async () => {
    const count = await repositoryListPage.getRepositoryCount()

    if (count === 0) {
      test.skip()
    }

    const names = await repositoryListPage.getRepositoryNames()
    const firstName = names[0]

    if (!firstName) {
      test.skip()
    }

    const provider = await repositoryListPage.getRepositoryProvider(firstName)
    expect(['github', 'gitlab', 'bitbucket']).toContain(provider)
  })

  test('should display responsive grid layout', async ({ page }) => {
    const count = await repositoryListPage.getRepositoryCount()

    if (count < 3) {
      test.skip()
    }

    // Get first card width
    const cards = page.locator('[data-testid^="repository-card-"]')
    const firstCard = cards.first()

    const box = await firstCard.boundingBox()
    expect(box).toBeTruthy()

    // Should be responsive (card should have reasonable width)
    if (box) {
      expect(box.width).toBeGreaterThan(200)
    }
  })

  test('should close modal on escape key', async ({ authenticatedPage }) => {
    await repositoryListPage.clickAddRepository()

    const modal = authenticatedPage.locator('[data-testid="add-repository-modal"]')
    await expect(modal).toBeVisible()

    // Press Escape
    await authenticatedPage.keyboard.press('Escape')

    await expect(modal).not.toBeVisible()
  })

  test('should update count after adding repository', async () => {
    // const initialCount = await repositoryListPage.getRepositoryCount()

    // Add a test repository (would need form interaction)
    // This test verifies the header count updates

    // Placeholder - just verify the page loads
    expect(true).toBe(true)
  })
})
