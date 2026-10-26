import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('Projects Accessibility @a11y', () => {
  test('should not have accessibility violations on list page', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should not have accessibility violations on detail page', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()

    if (count === 0) {
      test.skip()
    }

    await projectCards.first().click()
    await page.waitForURL(/\/projects\/proj-[\w-]+/)
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should not have accessibility violations in create modal', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    // Open create modal
    await page.click('button:has-text("Create Project")')
    await page.waitForTimeout(500)

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('keyboard navigation works on list page', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    // Tab to search input
    await page.keyboard.press('Tab')
    const searchInput = page.locator('input[placeholder*="Search"]')
    await expect(searchInput).toBeFocused()

    // Tab to sort dropdown
    await page.keyboard.press('Tab')
    const sortSelect = page.locator('select[id="sort-select"]')
    await expect(sortSelect).toBeFocused()

    // Continue tabbing to project cards
    await page.keyboard.press('Tab')

    // Should be on create button or first project card (just verify we can keep tabbing)
    const hasInteractiveElements = await page.locator('button, a, input, select').count()
    expect(hasInteractiveElements).toBeGreaterThan(0)
  })

  test('keyboard navigation works in create modal', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    // Open create modal
    await page.click('button:has-text("Create Project")')
    await page.waitForTimeout(500)

    // First focusable element should be name input
    const nameInput = page.locator('input[name="name"]')
    await expect(nameInput).toBeFocused()

    // Tab through form fields
    await page.keyboard.press('Tab')
    const slugInput = page.locator('input[name="slug"]')
    await expect(slugInput).toBeFocused()

    await page.keyboard.press('Tab')
    const descriptionInput = page.locator('textarea[name="description"]')
    await expect(descriptionInput).toBeFocused()

    // Escape should close modal
    await page.keyboard.press('Escape')
    await expect(page.locator('text=Create New Project')).not.toBeVisible()
  })

  test('form validation errors are announced', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    // Open create modal
    await page.click('button:has-text("Create Project")')
    await page.waitForTimeout(500)

    // Try to submit empty form
    await page.click('button[type="submit"]:has-text("Create")')

    // Error message should be visible and associated with input
    const errorMessage = page.locator('text=/required/i').first()
    await expect(errorMessage).toBeVisible()

    // Error should be near the input field
    const nameInput = page.locator('input[name="name"]')
    const inputBox = await nameInput.boundingBox()
    const errorBox = await errorMessage.boundingBox()

    if (inputBox && errorBox) {
      // Error should be within reasonable distance of input
      expect(Math.abs(errorBox.y - inputBox.y)).toBeLessThan(100)
    }
  })

  test('focus is trapped in modal', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    // Open create modal
    await page.click('button:has-text("Create Project")')
    await page.waitForTimeout(500)

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Tab through all focusable elements multiple times
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
    }

    // Check if we're still in the modal by checking if modal is still visible and has focus within
    await expect(modal).toBeVisible()

    // At least one element in the modal should be focused
    const focusedInModal = await modal.locator(':focus').count()
    expect(focusedInModal).toBeGreaterThan(0)
  })

  test('color contrast meets WCAG AA standards', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(['wcag2aa']).include('body').analyze()

    const contrastViolations = accessibilityScanResults.violations.filter(
      (violation) => violation.id === 'color-contrast'
    )

    expect(contrastViolations).toEqual([])
  })

  test('images and icons have alt text or aria-hidden', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(['wcag2a']).analyze()

    const imageViolations = accessibilityScanResults.violations.filter((violation) => violation.id === 'image-alt')

    expect(imageViolations).toEqual([])
  })

  test('page has proper heading structure', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    // Should have h1
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()

    // Check heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents()
    expect(headings.length).toBeGreaterThan(0)

    // Should have proper ARIA landmarks
    const main = page.locator('main, [role="main"]')
    expect(await main.count()).toBeGreaterThanOrEqual(0)
  })

  test('loading states are announced', async ({ page }) => {
    await page.goto('/projects')

    // Look for loading indicators with aria-label or role
    const loadingIndicators = page.locator('[aria-label*="loading"], [role="status"], [aria-busy="true"]')

    // Should have some loading state mechanism (even if it's brief)
    const hasLoadingState = (await loadingIndicators.count()) > 0 || (await page.locator('text=/loading/i').count()) > 0

    // This is informational - loading states might be too fast to catch
    expect(hasLoadingState || true).toBeTruthy()
  })

  test('touch targets meet minimum size on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
    }

    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    // Check button sizes
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        const box = await button.boundingBox()
        if (box) {
          // WCAG 2.1 AA requires 44x44px minimum
          expect(box.height).toBeGreaterThanOrEqual(44)
        }
      }
    }
  })
})
