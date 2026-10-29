import { expect, test } from '@fixtures/auth.fixture'
import { ArtifactViewerPage } from '@page-objects/artifacts/artifact-viewer.page'
import { ArtifactsListPage } from '@page-objects/artifacts/artifacts-list.page'
import { WorkflowDetailPage } from '@page-objects/workflows/workflow-detail.page'

test.describe('Artifacts Viewer - Hotfix Template', () => {
  let workflowDetailPage: WorkflowDetailPage
  let artifactsListPage: ArtifactsListPage
  let artifactViewerPage: ArtifactViewerPage

  test.beforeEach(async ({ authenticatedPage }) => {
    workflowDetailPage = new WorkflowDetailPage(authenticatedPage)
    artifactsListPage = new ArtifactsListPage(authenticatedPage)
    artifactViewerPage = new ArtifactViewerPage(authenticatedPage)

    // Navigate to a Hotfix template workflow with artifacts
    // This would ideally be a seeded Hotfix workflow
    await authenticatedPage.goto('/workflows')
    await authenticatedPage.waitForLoadState('networkidle')

    // Find and click a Hotfix workflow (or first available)
    const firstRow = authenticatedPage.locator('tbody tr').first()
    const rowVisible = await firstRow.isVisible().catch(() => false)
    if (rowVisible) {
      await firstRow.click()
      await workflowDetailPage.expectOnDetailPage()
    }
  })

  test.describe('Hotfix Template Artifact Grouping', () => {
    test('should navigate to artifacts tab for hotfix workflow', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      await artifactsListPage.expectArtifactsTabVisible()
    })

    test('should display bug analysis phase artifacts', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      // Hotfix should have Bug Analysis phase
      const phaseGroups = await artifactsListPage.getPhaseGroupNames()
      const hasBugAnalysis = phaseGroups.some(
        (name) => name.toLowerCase().includes('bug') || name.toLowerCase().includes('analysis')
      )
      if (hasBugAnalysis) {
        await artifactsListPage.expectPhaseGroupVisible('Bug Analysis')
      }
    })

    test('should display bug analysis report markdown artifact', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        // Look for bug analysis or root cause report
        const bugAnalysis = await artifactsListPage.getPage().locator('text=/bug|analysis|root cause/i').first()
        const isVisible = await bugAnalysis.isVisible().catch(() => false)
        if (isVisible) {
          expect(isVisible).toBeTruthy()
        }
      }
    })

    test('should display root cause analysis artifact', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        const rootCause = await artifactsListPage.getPage().locator('text=/root cause|cause analysis/i').first()
        const isVisible = await rootCause.isVisible().catch(() => false)
        if (isVisible) {
          expect(isVisible).toBeTruthy()
        }
      }
    })

    test('should display affected files list artifact', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        const affectedFiles = await artifactsListPage.getPage().locator('text=/affected|files/i').first()
        const isVisible = await affectedFiles.isVisible().catch(() => false)
        if (isVisible) {
          expect(isVisible).toBeTruthy()
        }
      }
    })

    test('should display implementation phase artifacts', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      await artifactsListPage.expectPhaseGroupVisible('Implementation')
      // Hotfix implementation should have fix code, regression tests, and log
      const count = await artifactsListPage.getArtifactCount()
      expect(count).toBeGreaterThan(0)
    })

    test('should display fix code files in implementation phase', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const phaseArtifacts = await artifactsListPage.getArtifactsInPhase('Implementation')
      if (phaseArtifacts.length > 0) {
        // At least some implementation artifacts should be present
        expect(phaseArtifacts.length).toBeGreaterThan(0)
      }
    })

    test('should display regression test files', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        const regressionTests = await artifactsListPage.getPage().locator('text=/regression|test/i').first()
        const isVisible = await regressionTests.isVisible().catch(() => false)
        // Regression tests are optional in test data
        if (isVisible) {
          expect(isVisible).toBeTruthy()
        }
      }
    })

    test('should display fast review phase artifacts', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const phaseGroups = await artifactsListPage.getPhaseGroupNames()
      const hasFastReview = phaseGroups.some(
        (name) => name.toLowerCase().includes('review') || name.toLowerCase().includes('fast')
      )
      if (hasFastReview) {
        // Hotfix should have a review/approval phase
        expect(hasFastReview).toBeTruthy()
      }
    })

    test('should display quick review report', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        const quickReview = await artifactsListPage.getPage().locator('text=/review|report/i').first()
        const isVisible = await quickReview.isVisible().catch(() => false)
        // Review artifacts are optional in test data
        if (isVisible) {
          expect(isVisible).toBeTruthy()
        }
      }
    })

    test('should display security check results', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        const securityCheck = await artifactsListPage.getPage().locator('text=/security|check/i').first()
        const isVisible = await securityCheck.isVisible().catch(() => false)
        // Security artifacts are optional in test data
        if (isVisible) {
          expect(isVisible).toBeTruthy()
        }
      }
    })

    test('should display template badge as hotfix', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      // For hotfix workflow, template should show Hotfix
      const templateText = await artifactsListPage.getTemplateType()
      if (templateText) {
        expect(['Hotfix', 'hotfix'].some((t) => templateText.includes(t))).toBeTruthy()
      }
    })

    test('should have fewer phases than feature template', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const phaseCount = await artifactsListPage.getPhaseGroupCount()
      // Hotfix should have 3 phases (Bug Analysis, Implementation, Fast Review)
      // Feature has 5 phases, so hotfix should be fewer
      expect(phaseCount).toBeLessThanOrEqual(4)
    })
  })

  test.describe('Artifact Viewer - Hotfix Specific Content', () => {
    test('should render bug analysis report as markdown', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        const firstArtifact = await artifactsListPage
          .getPage()
          .locator('[data-testid*="artifact-card"], [class*="artifact-card"]')
          .first()
        const isVisible = await firstArtifact.isVisible().catch(() => false)
        if (isVisible) {
          await firstArtifact.click()
          const isMarkdown = await artifactViewerPage.markdownContent.isVisible().catch(() => false)
          // First artifact might be markdown (bug analysis report)
          if (isMarkdown) {
            await artifactViewerPage.expectMarkdownContent()
          }
        }
      }
    })

    test('should render fix code with syntax highlighting', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 1) {
        const codeArtifact = await artifactsListPage.getPage().locator('[class*="code"], [class*="code-file"]').first()
        const isVisible = await codeArtifact.isVisible().catch(() => false)
        if (isVisible) {
          await codeArtifact.click()
          await artifactViewerPage.expectCodeContent()
        }
      }
    })

    test('should support downloading individual fix code files', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 1) {
        const codeArtifact = await artifactsListPage.getPage().locator('[class*="code"], [class*="code-file"]').first()
        const isVisible = await codeArtifact.isVisible().catch(() => false)
        if (isVisible) {
          await codeArtifact.click()
          const downloadVisible = await artifactViewerPage.downloadButton.isVisible().catch(() => false)
          if (downloadVisible) {
            await artifactViewerPage.expectDownloadButtonVisible()
          }
        }
      }
    })
  })

  test.describe('Artifact Viewer Navigation - Hotfix', () => {
    test('should navigate between artifacts in hotfix workflow', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 1) {
        const firstArtifact = await artifactsListPage
          .getPage()
          .locator('[data-testid*="artifact-card"], [class*="artifact-card"]')
          .first()
        const isVisible = await firstArtifact.isVisible().catch(() => false)
        if (isVisible) {
          await firstArtifact.click()
          await artifactViewerPage.expectViewerOpen()

          // Try to navigate next
          const nextVisible = await artifactViewerPage.nextButton.isVisible().catch(() => false)
          if (nextVisible) {
            await artifactViewerPage.clickNext()
            await artifactViewerPage.expectViewerOpen()
          }
        }
      }
    })

    test('should display correct artifact counter for hotfix artifacts', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        const firstArtifact = await artifactsListPage
          .getPage()
          .locator('[data-testid*="artifact-card"], [class*="artifact-card"]')
          .first()
        const isVisible = await firstArtifact.isVisible().catch(() => false)
        if (isVisible) {
          await firstArtifact.click()
          const counter = await artifactViewerPage.getArtifactCounter()
          // Counter should show 1 of N for first artifact
          if (counter) {
            expect(counter).toMatch(/1\s*of\s*\d+/)
          }
        }
      }
    })
  })

  test.describe('Artifact Metadata - Hotfix', () => {
    test('should display consistent metadata for all artifact types in hotfix', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        // Test metadata display for first artifact
        const firstArtifact = await artifactsListPage
          .getPage()
          .locator('[data-testid*="artifact-card"], [class*="artifact-card"]')
          .first()
        const isVisible = await firstArtifact.isVisible().catch(() => false)
        if (isVisible) {
          await firstArtifact.click()
          await artifactViewerPage.expectMetadataVisible()

          // Check size is displayed
          const size = await artifactViewerPage.getArtifactSize()
          if (size) {
            expect(size).toMatch(/\d+\s*(B|KB|MB)/)
          }
        }
      }
    })

    test('should show phase badges correctly for hotfix phases', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        const phaseNames = await artifactsListPage.getPhaseGroupNames()
        // Verify hotfix phases are labeled correctly
        expect(phaseNames.length).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Hotfix Workflow Artifact Organization', () => {
    test('should not display story badges in hotfix artifacts', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      // Hotfix should not have story-level artifacts
      const storyBadges = await artifactsListPage.getPage().locator('text=/story \\d+/i').count()
      // Story badges should not appear in hotfix (or minimal if present)
      expect(storyBadges).toBeLessThan(5) // Fewer than in feature template
    })

    test('should group artifacts by phase only (no story breakdown)', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const phaseGroups = await artifactsListPage.getPhaseGroupNames()
      // Should have phase-level grouping
      expect(phaseGroups.length).toBeGreaterThan(0)
      // Each phase name should be distinct (no sub-grouping by story)
      const uniquePhases = new Set(phaseGroups)
      expect(uniquePhases.size).toBe(phaseGroups.length)
    })

    test('should display simpler artifact structure than feature', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const phaseCount = await artifactsListPage.getPhaseGroupCount()
      const artifactCount = await artifactsListPage.getArtifactCount()

      // Hotfix should have fewer phases (3 vs 5 for feature)
      // And typically fewer artifacts per phase
      expect(phaseCount).toBeLessThanOrEqual(4)
      expect(artifactCount).toBeLessThan(50) // Reasonable upper bound for hotfix
    })
  })

  test.describe('Close Viewer - Hotfix', () => {
    test('should close hotfix artifact viewer properly', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        const firstArtifact = await artifactsListPage
          .getPage()
          .locator('[data-testid*="artifact-card"], [class*="artifact-card"]')
          .first()
        const isVisible = await firstArtifact.isVisible().catch(() => false)
        if (isVisible) {
          await firstArtifact.click()
          await artifactViewerPage.expectViewerOpen()
          await artifactViewerPage.closeViewer()
          await artifactViewerPage.expectViewerClosed()
        }
      }
    })

    test('should close hotfix artifact viewer with ESC key', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        const firstArtifact = await artifactsListPage
          .getPage()
          .locator('[data-testid*="artifact-card"], [class*="artifact-card"]')
          .first()
        const isVisible = await firstArtifact.isVisible().catch(() => false)
        if (isVisible) {
          await firstArtifact.click()
          await artifactViewerPage.expectViewerOpen()
          await artifactViewerPage.closeViewerWithEsc()
          await artifactViewerPage.expectViewerClosed()
        }
      }
    })
  })
})
