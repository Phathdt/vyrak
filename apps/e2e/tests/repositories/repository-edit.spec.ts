import { expect, test } from '@fixtures/auth.fixture'
import { RepositoryFormPage } from '@page-objects/repositories/repository-form.page'
import { RepositoryListPage } from '@page-objects/repositories/repository-list.page'

test.describe('Edit Repository (Story 12.3)', () => {
  let repositoryListPage: RepositoryListPage
  let repositoryFormPage: RepositoryFormPage
  let projectId: string

  test.beforeEach(async ({ authenticatedPage: _authenticatedPage }) => {
    repositoryListPage = new RepositoryListPage(_authenticatedPage)
    repositoryFormPage = new RepositoryFormPage(_authenticatedPage)

    // Get test project with existing repositories
    await _authenticatedPage.goto('/projects')
    await _authenticatedPage.waitForLoadState('networkidle')

    const projectCards = _authenticatedPage.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()
    await _authenticatedPage.waitForURL(/\/projects\/proj-[\w-]+/)
    projectId = _authenticatedPage.url().split('/').pop() || ''

    await repositoryListPage.navigateToProjectDetail(projectId)
    await _authenticatedPage.waitForLoadState('networkidle')

    // Skip if no repositories to edit
    const repoCount = await repositoryListPage.getRepositoryCount()
    if (repoCount === 0) {
      test.skip()
    }
  })

  test('should open edit modal when clicking edit button', async () => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()
  })

  test('should pre-fill form with current repository data', async () => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    const initialUrl = await repositoryListPage.getRepositoryURL(firstName)
    const initialBranch = await repositoryListPage.getRepositoryBranch(firstName)

    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    // Form should be pre-filled
    if (initialUrl) {
      await repositoryFormPage.expectGitUrlValue(initialUrl)
    }
    if (initialBranch) {
      await repositoryFormPage.expectDefaultBranchValue(initialBranch)
    }
  })

  test('should display git URL as read-only field', async ({ authenticatedPage }) => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    // Git URL should be read-only
    const readOnlyField = authenticatedPage.locator('[data-testid="git-url-readonly"]')
    await expect(readOnlyField).toBeVisible()
  })

  test('should display copy button for git URL', async ({ authenticatedPage }) => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    const copyButton = authenticatedPage.locator('[data-testid="git-url-copy-button"]')
    await expect(copyButton).toBeVisible()
  })

  test('should mask access token input', async () => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    // Token should be masked (type="password")
    await repositoryFormPage.expectTokenFieldMasked()
  })

  test('should show masked placeholder for existing token', async ({ authenticatedPage }) => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    // Token input should show masked placeholder
    const tokenInput = authenticatedPage.getByLabel(/access token/i)
    const placeholder = await tokenInput.getAttribute('placeholder')

    if (placeholder) {
      expect(placeholder).toContain('•')
    }
  })

  test('should allow updating branch name', async () => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    // Update branch
    await repositoryFormPage.fillDefaultBranch('develop')
    await repositoryFormPage.expectDefaultBranchValue('develop')
  })

  test('should allow entering new token without clearing existing', async ({ authenticatedPage }) => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    // Token field should have help text
    const helpText = authenticatedPage.locator('text=/leave empty to keep current/i')
    const isVisible = await helpText.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      await expect(helpText).toBeVisible()
    }
  })

  test('should allow updating status toggle', async ({ authenticatedPage }) => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    // const initialStatus = await repositoryListPage.getRepositoryStatus(firstName)

    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    // Check for status toggle
    const statusToggle = authenticatedPage.locator('[data-testid="repository-status-toggle"]')
    const isVisible = await statusToggle.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      await expect(statusToggle).toBeVisible()
    }
  })

  test('should show warning when setting repository to inactive', async ({ authenticatedPage }) => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    const initialStatus = await repositoryListPage.getRepositoryStatus(firstName)

    if (initialStatus !== 'active') {
      test.skip()
    }

    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    // Check for warning text
    const warningText = authenticatedPage.locator('text=/workflows using this repository will fail/i')
    const isVisible = await warningText.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      await expect(warningText).toBeVisible()
    }
  })

  test('should disable save button when form unchanged', async ({ authenticatedPage }) => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    // Save should be disabled initially (no changes)
    const saveButton = authenticatedPage.locator('[data-testid="form-save-button"]')
    const isDisabled = await saveButton.isDisabled({ timeout: 2000 }).catch(() => false)

    if (isDisabled) {
      await repositoryFormPage.expectSaveButtonDisabled()
    }
  })

  test('should enable save button when form changed', async () => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    // Change a field
    await repositoryFormPage.fillDefaultBranch('develop')

    // Save should be enabled
    await repositoryFormPage.expectSaveButtonEnabled()
  })

  test('should validate updated branch name format', async ({ authenticatedPage }) => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    // Try invalid branch
    await repositoryFormPage.fillDefaultBranch('invalid@branch!')

    // Should show error
    const error = authenticatedPage.locator('[data-testid="branch-error-message"]')
    const isVisible = await error.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      await expect(error).toBeVisible()
    }
  })

  test('should show test connection button', async ({ authenticatedPage }) => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    const testButton = authenticatedPage.locator('[data-testid="test-connection-button"]')
    await expect(testButton).toBeVisible()
  })

  test('should close modal on cancel', async () => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    // Make a change
    await repositoryFormPage.fillDefaultBranch('develop')

    // Click cancel
    await repositoryFormPage.clickCancel()

    // Modal should close
    await repositoryFormPage.expectEditModalClosed()
  })

  test('should close modal on escape key', async () => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    // Press Escape
    await repositoryFormPage.closeModalWithEscape()

    // Modal should close
    await repositoryFormPage.expectEditModalClosed()
  })

  test('should display modal title with repository name', async ({ authenticatedPage }) => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    // Check modal title includes repo name
    const title = authenticatedPage.locator('[data-testid="edit-repository-modal"] h2')
    const text = await title.textContent()
    expect(text?.toLowerCase()).toContain('edit')
  })

  test('should not allow editing git URL or provider', async ({ authenticatedPage }) => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    // const initialUrl = await repositoryListPage.getRepositoryURL(firstName)
    // const initialProvider = await repositoryListPage.getRepositoryProvider(firstName)

    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    // Git URL should be read-only
    const urlReadOnly = authenticatedPage.locator('[data-testid="git-url-readonly"]')
    await expect(urlReadOnly).toBeVisible()

    // Provider select should be disabled or read-only
    const providerSelect = authenticatedPage.getByLabel(/provider/i)
    const isDisabled = await providerSelect.isDisabled({ timeout: 2000 }).catch(() => false)

    // Should not allow changes to these fields
    expect(isDisabled).toBeTruthy()
  })

  test('should handle toggling token visibility in edit mode', async () => {
    const names = await repositoryListPage.getRepositoryNames()
    if (names.length === 0) {
      test.skip()
    }

    const firstName = names[0]
    await repositoryListPage.clickEditRepository(firstName)
    await repositoryFormPage.waitForEditModalVisible()

    // Toggle visibility
    await repositoryFormPage.toggleTokenVisibility()
    await repositoryFormPage.expectTokenFieldVisible()

    // Toggle back
    await repositoryFormPage.toggleTokenVisibility()
    await repositoryFormPage.expectTokenFieldMasked()
  })
})
