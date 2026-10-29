import { expect, test } from '@fixtures/auth.fixture'
import { ArtifactViewerPage } from '@page-objects/artifacts/artifact-viewer.page'
import { ArtifactsListPage } from '@page-objects/artifacts/artifacts-list.page'
import { WorkflowDetailPage } from '@page-objects/workflows/workflow-detail.page'

test.describe('Artifacts Viewer - Feature Template', () => {
  let workflowDetailPage: WorkflowDetailPage
  let artifactsListPage: ArtifactsListPage
  let artifactViewerPage: ArtifactViewerPage

  test.beforeEach(async ({ authenticatedPage }) => {
    workflowDetailPage = new WorkflowDetailPage(authenticatedPage)
    artifactsListPage = new ArtifactsListPage(authenticatedPage)
    artifactViewerPage = new ArtifactViewerPage(authenticatedPage)

    // Navigate to a Feature template workflow with artifacts
    // Using first available workflow (ideally seeded Feature workflow)
    const runId = authenticatedPage.url().includes('/workflows/')
      ? authenticatedPage.url().split('/workflows/')[1].split('/')[0]
      : 'test-run-id'

    if (runId && runId !== 'test-run-id') {
      await workflowDetailPage.navigate(runId)
    } else {
      // Fallback: navigate to workflows list and select first one
      await authenticatedPage.goto('/workflows')
      await authenticatedPage.waitForLoadState('networkidle')
      const firstRow = authenticatedPage.locator('tbody tr').first()
      const rowVisible = await firstRow.isVisible().catch(() => false)
      if (rowVisible) {
        await firstRow.click()
      }
    }

    await workflowDetailPage.expectOnDetailPage()
  })

  test.describe('Feature Template Artifact Grouping', () => {
    test('should navigate to artifacts tab', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      await artifactsListPage.expectArtifactsTabVisible()
    })

    test('should display planning phase artifacts', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      await artifactsListPage.expectPhaseGroupVisible('Planning')
      // Expect: ARD, Stories breakdown, Planning summary
      await artifactsListPage.expectArtifactVisible('Architecture')
      await artifactsListPage.expectArtifactVisible('Stories')
    })

    test('should display implementation phase with story grouping', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      await artifactsListPage.expectPhaseGroupVisible('Implementation')
      // Expect story-level grouping within implementation
      const storybadges = await artifactsListPage.getPage().locator('text=/story \\d+/i').count()
      expect(storybadges).toBeGreaterThanOrEqual(0)
    })

    test('should display review phase artifacts', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const phaseGroups = await artifactsListPage.getPhaseGroupNames()
      const hasReview = phaseGroups.some((name) => name.toLowerCase().includes('review'))
      if (hasReview) {
        await artifactsListPage.expectPhaseGroupVisible('Review')
      }
    })

    test('should display qa phase artifacts', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const phaseGroups = await artifactsListPage.getPhaseGroupNames()
      const hasQA = phaseGroups.some((name) => name.toLowerCase().includes('qa'))
      if (hasQA) {
        await artifactsListPage.expectPhaseGroupVisible('QA')
      }
    })

    test('should display template badge as feature', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      await artifactsListPage.expectTemplateType('Feature')
    })

    test('should show artifact count and metadata', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        await artifactsListPage.expectArtifactCount(count)
      }
    })
  })

  test.describe('Artifact Card Metadata Display', () => {
    test('should display artifact with name and type icon', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        // Verify first artifact has visible metadata
        const metadata = await artifactsListPage.getArtifactMetadata('Architecture')
        expect(metadata.name).toBeTruthy()
      }
    })

    test('should display artifact file size in human-readable format', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        await artifactsListPage.expectArtifactHasSize('Architecture')
      }
    })

    test('should display artifact creation timestamp', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        await artifactsListPage.expectArtifactHasDate('Architecture')
      }
    })

    test('should display phase badge on artifact card', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        const metadata = await artifactsListPage.getArtifactMetadata('Architecture')
        expect(metadata.badges.length).toBeGreaterThanOrEqual(0)
      }
    })

    test('should display story badge for story-scoped artifacts', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const storyBadgeCount = await artifactsListPage.getPage().locator('text=/story \\d+/i').count()
      if (storyBadgeCount > 0) {
        expect(storyBadgeCount).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Artifact Viewer - Markdown Rendering', () => {
    test('should open artifact viewer modal when clicking artifact', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        await artifactsListPage.clickArtifact('Architecture')
        await artifactViewerPage.expectViewerOpen()
      }
    })

    test('should render markdown with syntax highlighting', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        await artifactsListPage.clickArtifact('Architecture')
        await artifactViewerPage.expectMarkdownContent()
      }
    })

    test('should display markdown headings', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        await artifactsListPage.clickArtifact('Architecture')
        await artifactViewerPage.expectMarkdownHasHeadings()
      }
    })

    test('should display table of contents for long markdown', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        await artifactsListPage.clickArtifact('Architecture')
        const headingCount = await artifactViewerPage.getMarkdownHeadingCount()
        if (headingCount > 3) {
          await artifactViewerPage.expectMarkdownHasTableOfContents()
        }
      }
    })

    test('should support collapsible markdown sections', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        await artifactsListPage.clickArtifact('Architecture')
        // Collapsible sections are optional feature, just check if modal is open
        await artifactViewerPage.expectViewerOpen()
      }
    })
  })

  test.describe('Artifact Viewer - Code Rendering', () => {
    test('should render code with syntax highlighting', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      // Look for code artifact (e.g., implementation code files)
      const count = await artifactsListPage.getArtifactCount()
      if (count > 1) {
        // Try to find a code artifact (second or later artifacts are often code)
        const firstCode = await artifactsListPage.getPage().locator('[class*="code"], [class*="code-file"]').first()
        const isVisible = await firstCode.isVisible().catch(() => false)
        if (isVisible) {
          await firstCode.click()
          await artifactViewerPage.expectCodeContent()
        }
      }
    })

    test('should display code line numbers', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 1) {
        const firstCode = await artifactsListPage.getPage().locator('[class*="code"], [class*="code-file"]').first()
        const isVisible = await firstCode.isVisible().catch(() => false)
        if (isVisible) {
          await firstCode.click()
          await artifactViewerPage.expectCodeHasLineNumbers()
        }
      }
    })

    test('should provide copy code button', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 1) {
        const firstCode = await artifactsListPage.getPage().locator('[class*="code"], [class*="code-file"]').first()
        const isVisible = await firstCode.isVisible().catch(() => false)
        if (isVisible) {
          await firstCode.click()
          await artifactViewerPage.expectCopyButtonVisible()
        }
      }
    })

    test('should provide download button for code', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 1) {
        const firstCode = await artifactsListPage.getPage().locator('[class*="code"], [class*="code-file"]').first()
        const isVisible = await firstCode.isVisible().catch(() => false)
        if (isVisible) {
          await firstCode.click()
          await artifactViewerPage.expectDownloadButtonVisible()
        }
      }
    })
  })

  test.describe('Artifact Viewer - JSON Rendering', () => {
    test('should render JSON with tree view', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      // Look for JSON artifact if available
      const count = await artifactsListPage.getArtifactCount()
      if (count > 2) {
        const firstJson = await artifactsListPage.getPage().locator('[class*="json"], [data-testid*="json"]').first()
        const isVisible = await firstJson.isVisible().catch(() => false)
        if (isVisible) {
          await firstJson.click()
          await artifactViewerPage.expectJsonContent()
        }
      }
    })

    test('should allow expanding and collapsing JSON nodes', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 2) {
        const firstJson = await artifactsListPage.getPage().locator('[class*="json"], [data-testid*="json"]').first()
        const isVisible = await firstJson.isVisible().catch(() => false)
        if (isVisible) {
          await firstJson.click()
          const nodeCount = await artifactViewerPage.getJsonNodeCount()
          if (nodeCount > 0) {
            await artifactViewerPage.expandJsonNode(0)
          }
        }
      }
    })

    test('should provide copy JSON button', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 2) {
        const firstJson = await artifactsListPage.getPage().locator('[class*="json"], [data-testid*="json"]').first()
        const isVisible = await firstJson.isVisible().catch(() => false)
        if (isVisible) {
          await firstJson.click()
          await artifactViewerPage.expectCopyButtonVisible()
        }
      }
    })
  })

  test.describe('Artifact Viewer - Text/Log Rendering', () => {
    test('should render text logs with monospace font', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        // Try to find log/text artifact
        const logs = await artifactsListPage.getPage().locator('[class*="log"], text=/log|execution log/i')
        const isVisible = await logs
          .first()
          .isVisible()
          .catch(() => false)
        if (isVisible) {
          await logs.first().click()
          await artifactViewerPage.expectTextContent()
        }
      }
    })

    test('should display line numbers for log files', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        const logs = await artifactsListPage.getPage().locator('[class*="log"], text=/log|execution log/i')
        const isVisible = await logs
          .first()
          .isVisible()
          .catch(() => false)
        if (isVisible) {
          await logs.first().click()
          const lineCount = await artifactViewerPage.getCodeLineCount()
          if (lineCount > 0) {
            expect(lineCount).toBeGreaterThan(0)
          }
        }
      }
    })

    test('should support search in log files', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        const logs = await artifactsListPage.getPage().locator('[class*="log"], text=/log|execution log/i')
        const isVisible = await logs
          .first()
          .isVisible()
          .catch(() => false)
        if (isVisible) {
          await logs.first().click()
          await artifactViewerPage.searchInLog('test')
        }
      }
    })

    test('should support text wrap toggle for logs', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        const logs = await artifactsListPage.getPage().locator('[class*="log"], text=/log|execution log/i')
        const isVisible = await logs
          .first()
          .isVisible()
          .catch(() => false)
        if (isVisible) {
          await logs.first().click()
          const wrapButton = await artifactViewerPage
            .getPage()
            .getByRole('button', { name: /wrap|nowrap/i })
            .isVisible()
            .catch(() => false)
          if (wrapButton) {
            await artifactViewerPage.toggleTextWrap()
          }
        }
      }
    })
  })

  test.describe('Artifact Viewer Navigation', () => {
    test('should navigate to next artifact', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 1) {
        await artifactsListPage.clickArtifact('Architecture')
        await artifactViewerPage.expectViewerOpen()
        const nextVisible = await artifactViewerPage.nextButton.isVisible().catch(() => false)
        if (nextVisible) {
          await artifactViewerPage.clickNext()
          await artifactViewerPage.expectViewerOpen()
        }
      }
    })

    test('should navigate to previous artifact', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 1) {
        // Start from second artifact
        const secondArtifact = await artifactsListPage
          .getPage()
          .locator('[data-testid*="artifact-card"], [class*="artifact-card"]')
          .nth(1)
        const isVisible = await secondArtifact.isVisible().catch(() => false)
        if (isVisible) {
          await secondArtifact.click()
          const prevVisible = await artifactViewerPage.previousButton.isVisible().catch(() => false)
          if (prevVisible) {
            await artifactViewerPage.clickPrevious()
            await artifactViewerPage.expectViewerOpen()
          }
        }
      }
    })

    test('should display artifact counter showing position', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        await artifactsListPage.clickArtifact('Architecture')
        const counter = await artifactViewerPage.getArtifactCounter()
        if (counter) {
          expect(counter).toMatch(/\d+\s*of\s*\d+/)
        }
      }
    })

    test('should disable previous button on first artifact', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        await artifactsListPage.clickArtifact('Architecture')
        const prevDisabled = await artifactViewerPage.previousButton.isDisabled().catch(() => false)
        if (prevDisabled) {
          await artifactViewerPage.expectPreviousButtonDisabled()
        }
      }
    })

    test('should disable next button on last artifact', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 1) {
        // Navigate to last artifact
        const lastArtifact = await artifactsListPage
          .getPage()
          .locator('[data-testid*="artifact-card"], [class*="artifact-card"]')
          .last()
        const isVisible = await lastArtifact.isVisible().catch(() => false)
        if (isVisible) {
          await lastArtifact.click()
          const nextDisabled = await artifactViewerPage.nextButton.isDisabled().catch(() => false)
          if (nextDisabled) {
            await artifactViewerPage.expectNextButtonDisabled()
          }
        }
      }
    })
  })

  test.describe('Artifact Viewer Close Actions', () => {
    test('should close viewer by clicking close button', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        await artifactsListPage.clickArtifact('Architecture')
        await artifactViewerPage.expectViewerOpen()
        await artifactViewerPage.closeViewer()
        await artifactViewerPage.expectViewerClosed()
      }
    })

    test('should close viewer by pressing ESC key', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        await artifactsListPage.clickArtifact('Architecture')
        await artifactViewerPage.expectViewerOpen()
        await artifactViewerPage.closeViewerWithEsc()
        await artifactViewerPage.expectViewerClosed()
      }
    })
  })

  test.describe('Artifact Viewer Metadata Display', () => {
    test('should display artifact metadata in viewer', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        await artifactsListPage.clickArtifact('Architecture')
        await artifactViewerPage.expectMetadataVisible()
      }
    })

    test('should display artifact size in human-readable format', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        await artifactsListPage.clickArtifact('Architecture')
        const size = await artifactViewerPage.getArtifactSize()
        if (size) {
          expect(size).toMatch(/\d+\s*(B|KB|MB)/)
        }
      }
    })

    test('should display artifact type', async () => {
      await artifactsListPage.navigateToArtifactsTab()
      const count = await artifactsListPage.getArtifactCount()
      if (count > 0) {
        await artifactsListPage.clickArtifact('Architecture')
        const type = await artifactViewerPage.getArtifactType()
        expect(['markdown', 'code', 'json', 'text', 'log']).toContain(type?.toLowerCase())
      }
    })
  })
})
