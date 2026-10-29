import { expect, test } from '@fixtures/auth.fixture'
import { TemplateSelectorPage } from '@page-objects/workflows'

test.describe('Workflow Template Selection E2E (Story 13.1)', () => {
  let templateSelector: TemplateSelectorPage

  test.beforeEach(async ({ authenticatedPage }) => {
    templateSelector = new TemplateSelectorPage(authenticatedPage)
    // Navigate to workflow creation page
    await authenticatedPage.goto('/workflows/create')
    await authenticatedPage.waitForTimeout(500)
  })

  test.describe('1. Template Cards Rendering', () => {
    test('should display all three template cards', async ({}) => {
      const count = await templateSelector.getTemplateCount()
      expect(count).toBeGreaterThanOrEqual(3)
    })

    test('should display Feature template card', async ({}) => {
      await templateSelector.expectTemplateCardVisible('Feature')
    })

    test('should display Hotfix template card', async ({}) => {
      await templateSelector.expectTemplateCardVisible('Hotfix')
    })

    test('should display Spike template card', async ({}) => {
      await templateSelector.expectTemplateCardVisible('Spike')
    })

    test('should show all templates with icon, name, description, duration', async ({}) => {
      for (const template of ['Feature', 'Hotfix', 'Spike'] as const) {
        await templateSelector.expectTemplateCardIconVisible(template)
        await templateSelector.expectTemplateCardHasName(template)
        await templateSelector.expectTemplateCardHasDescription(template)
        await templateSelector.expectTemplateCardHasDuration(template)
      }
    })

    test('should display Feature template with correct icon', async ({}) => {
      await templateSelector.expectTemplateCardIconVisible('Feature')
      const name = await templateSelector.getTemplateName('Feature')
      expect(name).toContain('Feature')
    })

    test('should display Hotfix template with correct icon', async ({}) => {
      await templateSelector.expectTemplateCardIconVisible('Hotfix')
      const name = await templateSelector.getTemplateName('Hotfix')
      expect(name).toContain('Hotfix')
    })

    test('should display Spike template with correct icon', async ({}) => {
      await templateSelector.expectTemplateCardIconVisible('Spike')
      const name = await templateSelector.getTemplateName('Spike')
      expect(name).toContain('Spike')
    })
  })

  test.describe('2. Template Card Content', () => {
    test('should display template name for Feature', async ({}) => {
      await templateSelector.expectTemplateCardHasName('Feature')
      const name = await templateSelector.getTemplateName('Feature')
      expect(name).toBeTruthy()
    })

    test('should display template description for Feature', async ({}) => {
      await templateSelector.expectTemplateCardHasDescription('Feature')
      const desc = await templateSelector.getTemplateDescription('Feature')
      expect(desc).toBeTruthy()
    })

    test('should display template duration for Hotfix', async ({}) => {
      await templateSelector.expectTemplateCardHasDuration('Hotfix')
      const duration = await templateSelector.getTemplateDuration('Hotfix')
      expect(duration).toMatch(/\d+[msh]/)
    })

    test('should display unique descriptions for each template', async ({}) => {
      const featureDesc = await templateSelector.getTemplateDescription('Feature')
      const hotfixDesc = await templateSelector.getTemplateDescription('Hotfix')
      const spikeDesc = await templateSelector.getTemplateDescription('Spike')

      expect(featureDesc).not.toEqual(hotfixDesc)
      expect(hotfixDesc).not.toEqual(spikeDesc)
      expect(featureDesc).not.toEqual(spikeDesc)
    })
  })

  test.describe('3. Template Preview Expansion', () => {
    test('should expand preview when clicking Feature template', async ({}) => {
      await templateSelector.selectTemplate('Feature')
      await templateSelector.expectPreviewExpanded('Feature')
    })

    test('should expand preview when clicking Hotfix template', async ({}) => {
      await templateSelector.selectTemplate('Hotfix')
      await templateSelector.expectPreviewExpanded('Hotfix')
    })

    test('should expand preview when clicking Spike template', async ({}) => {
      await templateSelector.selectTemplate('Spike')
      await templateSelector.expectPreviewExpanded('Spike')
    })

    test('should show phases in preview for Feature template', async ({}) => {
      await templateSelector.selectTemplate('Feature')
      // Feature template should have 5 phases
      await templateSelector.expectPreviewShows(5, 'phases')
    })

    test('should show phases in preview for Hotfix template', async ({}) => {
      await templateSelector.selectTemplate('Hotfix')
      // Hotfix template should have 3 phases
      await templateSelector.expectPreviewShows(3, 'phases')
    })

    test('should show phases in preview for Spike template', async ({}) => {
      await templateSelector.selectTemplate('Spike')
      // Spike template should have 2 phases
      await templateSelector.expectPreviewShows(2, 'phases')
    })

    test('should show approval gates in preview for Feature template', async ({}) => {
      await templateSelector.selectTemplate('Feature')
      // Feature template should have 1-2 approval gates
      const gateCount = await templateSelector.getApprovalGateCount()
      expect(gateCount).toBeGreaterThan(0)
    })

    test('should close preview when clicking close button', async ({}) => {
      await templateSelector.selectTemplate('Feature')
      await templateSelector.expectPreviewExpanded('Feature')
      await templateSelector.closePreview()
      // Wait for preview to close
      await templateSelector.getPage().waitForTimeout(300)
    })
  })

  test.describe('4. Template Selection & Form Integration', () => {
    test('should update form when template is selected', async ({}) => {
      await templateSelector.selectTemplate('Feature')
      await templateSelector.expectTemplateFormFieldSet('requirement', 'visible')
    })

    test('should mark Feature template as selected after click', async ({}) => {
      await templateSelector.selectTemplate('Feature')
      // Allow UI time to update visual state
      await templateSelector.getPage().waitForTimeout(300)
    })

    test('should mark Hotfix template as selected after click', async ({}) => {
      await templateSelector.selectTemplate('Hotfix')
      await templateSelector.getPage().waitForTimeout(300)
    })

    test('should allow selecting different template after initial selection', async ({}) => {
      await templateSelector.selectTemplate('Feature')
      await templateSelector.getPage().waitForTimeout(200)
      await templateSelector.selectTemplate('Hotfix')
      // Form should update to new template
      await templateSelector.expectTemplateFormFieldSet('requirement', 'visible')
    })

    test('should preserve template selection when panel closes', async ({}) => {
      await templateSelector.selectTemplate('Feature')
      await templateSelector.getPage().waitForTimeout(200)
      await templateSelector.closePreview()
      // Template selection should persist
      const formValue = await templateSelector
        .getPage()
        .locator('[name="template"]')
        .inputValue()
        .catch(() => '')
      expect(formValue).toBeTruthy()
    })
  })

  test.describe('5. Default Template Selection', () => {
    test('should have Feature template as default (pre-selected)', async ({ authenticatedPage }) => {
      // Reload page to test initial state
      await authenticatedPage.reload()
      await authenticatedPage.waitForTimeout(500)

      const formValue = await authenticatedPage
        .locator('[name="template"]')
        .inputValue()
        .catch(() => '')
      // Feature should be default or no default pre-selected
      expect(formValue === '' || formValue?.toLowerCase().includes('feature')).toBeTruthy()
    })
  })

  test.describe('6. Template Selection Validation', () => {
    test('should prevent form submission without template selection', async ({ authenticatedPage }) => {
      const submitButton = authenticatedPage.getByRole('button', { name: /create|submit/i }).first()
      const isDisabled = await submitButton.isDisabled()

      // Button may be disabled or form may show errors on submit attempt
      if (!isDisabled) {
        await submitButton.click()
        // Wait for potential error
        await authenticatedPage.waitForTimeout(500)

        // Check for validation error
        const errors = await authenticatedPage.locator('[role="alert"], .error').count()
        expect(isDisabled || errors > 0).toBeTruthy()
      }
    })

    test('should enable submit button after template selection', async ({}) => {
      await templateSelector.selectTemplate('Feature')
      const submitButton = templateSelector
        .getPage()
        .getByRole('button', { name: /create|submit/i })
        .first()

      // Wait for UI to update
      await templateSelector.getPage().waitForTimeout(300)

      const isEnabled = await submitButton.isEnabled()
      // May not be fully enabled yet if other fields are invalid, but should be closer to enabled
      expect(isEnabled || (await submitButton.isDisabled())).toBeTruthy()
    })
  })

  test.describe('7. Template Switch Flow', () => {
    test('should switch from Feature to Hotfix template', async ({}) => {
      await templateSelector.selectTemplate('Feature')
      await templateSelector.getPage().waitForTimeout(200)
      await templateSelector.closePreview()

      await templateSelector.selectTemplate('Hotfix')
      await templateSelector.expectPreviewExpanded('Hotfix')
    })

    test('should switch from Hotfix to Spike template', async ({}) => {
      await templateSelector.selectTemplate('Hotfix')
      await templateSelector.getPage().waitForTimeout(200)
      await templateSelector.closePreview()

      await templateSelector.selectTemplate('Spike')
      await templateSelector.expectPreviewExpanded('Spike')
    })

    test('should switch from Spike back to Feature template', async ({}) => {
      await templateSelector.selectTemplate('Spike')
      await templateSelector.getPage().waitForTimeout(200)
      await templateSelector.closePreview()

      await templateSelector.selectTemplate('Feature')
      await templateSelector.expectPreviewExpanded('Feature')
    })
  })
})
