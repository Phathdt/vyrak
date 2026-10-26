import { expect, test } from '@playwright/test'

test.describe('Project Edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
  })

  test('should open edit modal', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    // Navigate to detail page
    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Click edit button
    const editButton = page.locator('button:has-text("Edit")')

    if ((await editButton.count()) === 0) {
      test.skip()
    }

    await editButton.click()

    // Modal should open
    await expect(page.locator('text=Edit Project')).toBeVisible()
  })

  test('should pre-fill form with existing data', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    // Navigate to detail page
    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Open edit modal
    const editButton = page.locator('button:has-text("Edit")')

    if ((await editButton.count()) === 0) {
      test.skip()
    }

    await editButton.click()
    await page.waitForTimeout(200)

    // Name field should be pre-filled
    const nameInput = page.locator('input[name="name"]')
    const currentValue = await nameInput.inputValue()

    expect(currentValue).toBeTruthy()
  })

  test('should update project name', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    // Navigate to detail page
    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Open edit modal
    const editButton = page.locator('button:has-text("Edit")')

    if ((await editButton.count()) === 0) {
      test.skip()
    }

    await editButton.click()

    // Update name
    const timestamp = Date.now()
    const newName = `Updated Project ${timestamp}`

    await page.fill('input[name="name"]', newName)

    // Save
    await page.click('button[type="submit"]:has-text("Save")')

    // Wait for modal to close
    await page.waitForTimeout(1000)

    // Should see updated name (either in page or toast)
    const nameUpdated =
      (await page
        .locator(`text=${newName}`)
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator('text=/updated successfully/i')
        .isVisible()
        .catch(() => false))

    expect(nameUpdated).toBeTruthy()
  })

  test('should update project description', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    // Navigate to detail page
    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Open edit modal
    const editButton = page.locator('button:has-text("Edit")')

    if ((await editButton.count()) === 0) {
      test.skip()
    }

    await editButton.click()

    // Update description
    const newDescription = `Updated description at ${Date.now()}`
    await page.fill('textarea[name="description"]', newDescription)

    // Save
    await page.click('button[type="submit"]:has-text("Save")')

    await page.waitForTimeout(1000)

    // Should show success
    const hasSuccess =
      (await page
        .locator('text=/updated successfully/i')
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator(`text=${newDescription}`)
        .isVisible()
        .catch(() => false))

    expect(hasSuccess).toBeTruthy()
  })

  test('should not allow changing slug', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    // Navigate to detail page
    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Open edit modal
    const editButton = page.locator('button:has-text("Edit")')

    if ((await editButton.count()) === 0) {
      test.skip()
    }

    await editButton.click()

    // Slug input should be disabled
    const slugInput = page.locator('input[name="slug"]')

    if ((await slugInput.count()) > 0) {
      const isDisabled = await slugInput.isDisabled()
      expect(isDisabled).toBeTruthy()
    }
  })

  test('should validate required fields', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    // Navigate to detail page
    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Open edit modal
    const editButton = page.locator('button:has-text("Edit")')

    if ((await editButton.count()) === 0) {
      test.skip()
    }

    await editButton.click()

    // Clear name
    await page.fill('input[name="name"]', '')

    // Try to save
    await page.click('button[type="submit"]:has-text("Save")')

    // Should show validation error
    await expect(page.locator('text=/required/i').first()).toBeVisible()
  })

  test('should cancel edit without saving', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    // Navigate to detail page
    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Get original name
    const originalName = await page.locator('h1').textContent()

    // Open edit modal
    const editButton = page.locator('button:has-text("Edit")')

    if ((await editButton.count()) === 0) {
      test.skip()
    }

    await editButton.click()

    // Change name
    await page.fill('input[name="name"]', 'Should Not Save')

    // Cancel
    const cancelButton = page.locator('button:has-text("Cancel")')

    if (await cancelButton.isVisible()) {
      await cancelButton.click()
    } else {
      await page.keyboard.press('Escape')
    }

    // Wait for modal to close
    await page.waitForTimeout(500)

    // Name should still be original
    const currentName = await page.locator('h1').textContent()
    expect(currentName).toBe(originalName)
  })

  test('should show optimistic update', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    // Navigate to detail page
    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Open edit modal
    const editButton = page.locator('button:has-text("Edit")')

    if ((await editButton.count()) === 0) {
      test.skip()
    }

    await editButton.click()

    // Update name
    const newName = `Optimistic ${Date.now()}`
    await page.fill('input[name="name"]', newName)

    // Save
    await page.click('button[type="submit"]:has-text("Save")')

    // Should see update quickly (optimistic)
    await page.waitForTimeout(500)

    const nameVisible = await page
      .locator(`text=${newName}`)
      .isVisible()
      .catch(() => false)

    expect(nameVisible).toBeTruthy()
  })

  test('should handle save errors gracefully', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    // Navigate to detail page
    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Open edit modal
    const editButton = page.locator('button:has-text("Edit")')

    if ((await editButton.count()) === 0) {
      test.skip()
    }

    await editButton.click()

    // Try to set a very long name (might fail validation)
    const longName = 'A'.repeat(300)
    await page.fill('input[name="name"]', longName)

    // Try to save
    await page.click('button[type="submit"]:has-text("Save")')

    // Should either show validation error or handle gracefully
    await page.waitForTimeout(1000)

    // Modal might still be open if validation failed
    const modalStillOpen = await page
      .locator('text=Edit Project')
      .isVisible()
      .catch(() => false)

    expect(modalStillOpen).toBeTruthy()
  })

  test('should close modal on escape key', async ({ page }) => {
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    // Navigate to detail page
    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)

    // Open edit modal
    const editButton = page.locator('button:has-text("Edit")')

    if ((await editButton.count()) === 0) {
      test.skip()
    }

    await editButton.click()
    await expect(page.locator('text=Edit Project')).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')

    // Modal should close
    await expect(page.locator('text=Edit Project')).not.toBeVisible()
  })
})
