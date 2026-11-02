/**
 * E2E Test: Workflow Execution API
 * Tests complete workflow execution through API endpoints
 */

import { test, expect } from '@playwright/test'

import type { Page } from '@playwright/test'

const API_BASE = process.env.VITE_API_BASE_URL || 'http://localhost:3000'

// Test data
const TEST_ORG_ID = 'org-test-e2e'
const TEST_PROJECT_ID = 'project-test-e2e'
let TEST_WORKFLOW_ID: string
let AUTH_TOKEN: string

// Helper to make authenticated API requests
async function apiRequest(page: Page, method: string, path: string, body?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`
  }

  const options: any = {
    method,
    headers,
  }

  if (body) {
    options.data = body
  }

  return await page.request.fetch(`${API_BASE}${path}`, options)
}

test.describe('Workflow Execution E2E Tests', () => {
  test.beforeAll(async ({ browser }) => {
    // Setup: Login and get auth token
    const context = await browser.newContext()
    const page = await context.newPage()

    // Login (adjust based on your auth implementation)
    const loginResponse = await page.request.post(`${API_BASE}/api/auth/login`, {
      data: {
        email: 'test@example.com',
        password: 'test-password',
      },
    })

    if (loginResponse.ok()) {
      const loginData = await loginResponse.json()
      AUTH_TOKEN = loginData.access_token || loginData.token
    }

    await context.close()
  })

  test.describe('1. Workflow Creation & Setup', () => {
    test('should create a new workflow', async ({ page }) => {
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows`,
        {
          type: 'STORY',
          title: 'E2E Test: User Authentication System',
          description: 'Implement secure user authentication with JWT tokens for E2E testing',
        }
      )

      expect(response.ok()).toBeTruthy()
      const workflow = await response.json()

      expect(workflow).toHaveProperty('id')
      expect(workflow.title).toBe('E2E Test: User Authentication System')
      expect(workflow.status).toBe('DRAFT')

      TEST_WORKFLOW_ID = workflow.id
    })

    test('should start workflow and activate Planning phase', async ({ page }) => {
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/start`
      )

      expect(response.ok()).toBeTruthy()
      const workflow = await response.json()

      expect(workflow.status).toBe('ACTIVE')
      expect(workflow.currentPhaseKey).toBe('planning')
    })

    test('should list workflow phases', async ({ page }) => {
      const response = await apiRequest(
        page,
        'GET',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/phases`
      )

      expect(response.ok()).toBeTruthy()
      const phases = await response.json()

      expect(Array.isArray(phases)).toBeTruthy()
      expect(phases.length).toBe(6) // 6 fixed phases

      const phaseKeys = phases.map((p: any) => p.key)
      expect(phaseKeys).toContain('planning')
      expect(phaseKeys).toContain('technical_refinement')
      expect(phaseKeys).toContain('implementation')
      expect(phaseKeys).toContain('code_review')
      expect(phaseKeys).toContain('qa')
      expect(phaseKeys).toContain('rework')
    })
  })

  test.describe('2. Planning Phase', () => {
    test('should chat with Planning agent', async ({ page }) => {
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/planning/chat`,
        {
          message: 'I want to build a user authentication system with email/password and JWT tokens.',
        }
      )

      expect(response.ok()).toBeTruthy()
      const chatResponse = await response.json()

      expect(chatResponse).toHaveProperty('message')
      expect(chatResponse).toHaveProperty('sessionId')
    })

    test('should generate PRD artifact', async ({ page }) => {
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/planning/generate-prd`
      )

      expect(response.ok()).toBeTruthy()
      const result = await response.json()

      expect(result).toHaveProperty('artifactId')
      expect(result).toHaveProperty('downloadUrl')
    })

    test('should list Planning phase artifacts', async ({ page }) => {
      const response = await apiRequest(
        page,
        'GET',
        `/api/organizations/${TEST_ORG_ID}/workflows/${TEST_WORKFLOW_ID}/artifacts?phaseKey=planning`
      )

      expect(response.ok()).toBeTruthy()
      const artifacts = await response.json()

      expect(Array.isArray(artifacts)).toBeTruthy()
      expect(artifacts.length).toBeGreaterThanOrEqual(1)

      const prdArtifact = artifacts.find((a: any) => a.type === 'prd')
      expect(prdArtifact).toBeDefined()
      expect(prdArtifact.approvalStatus).toBe('DRAFT')
    })

    test('should approve PRD artifact', async ({ page }) => {
      // Get PRD artifact ID
      const listResponse = await apiRequest(
        page,
        'GET',
        `/api/organizations/${TEST_ORG_ID}/workflows/${TEST_WORKFLOW_ID}/artifacts?phaseKey=planning`
      )
      const artifacts = await listResponse.json()
      const prdArtifact = artifacts.find((a: any) => a.type === 'prd')

      // Request approval
      const requestResponse = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/artifacts/${prdArtifact.id}/request-approval`
      )
      expect(requestResponse.ok()).toBeTruthy()

      // Approve
      const approveResponse = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/artifacts/${prdArtifact.id}/approve`
      )
      expect(approveResponse.ok()).toBeTruthy()

      const approvedArtifact = await approveResponse.json()
      expect(approvedArtifact.approvalStatus).toBe('APPROVED')
    })

    test('should approve Planning phase', async ({ page }) => {
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/phases/planning/approve`
      )

      expect(response.ok()).toBeTruthy()
      const phase = await response.json()

      expect(phase.approvalStatus).toBe('APPROVED')
      expect(phase.status).toBe('COMPLETED')
    })
  })

  test.describe('3. Technical Refinement Phase', () => {
    test('should start Technical Refinement phase', async ({ page }) => {
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/phases/technical_refinement/start`
      )

      expect(response.ok()).toBeTruthy()
      const workflow = await response.json()

      expect(workflow.currentPhaseKey).toBe('technical_refinement')
    })

    test('should generate technical artifacts (ADR, Implementation Plan)', async ({ page }) => {
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/technical-refinement/generate-artifacts`
      )

      expect(response.ok()).toBeTruthy()
      const result = await response.json()

      expect(result).toHaveProperty('artifacts')
      expect(Array.isArray(result.artifacts)).toBeTruthy()
      expect(result.artifacts.length).toBeGreaterThanOrEqual(2) // At least ADR and Plan
    })

    test('should generate sub-tasks from Implementation Plan', async ({ page }) => {
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/technical-refinement/generate-subtasks`
      )

      expect(response.ok()).toBeTruthy()
      const result = await response.json()

      expect(result).toHaveProperty('subTasks')
      expect(Array.isArray(result.subTasks)).toBeTruthy()
      expect(result.subTasks.length).toBeGreaterThan(0)
    })

    test('should list sub-tasks', async ({ page }) => {
      const response = await apiRequest(
        page,
        'GET',
        `/api/organizations/${TEST_ORG_ID}/workflows/${TEST_WORKFLOW_ID}/subtasks`
      )

      expect(response.ok()).toBeTruthy()
      const subTasks = await response.json()

      expect(Array.isArray(subTasks)).toBeTruthy()
      expect(subTasks.length).toBeGreaterThan(0)
      expect(subTasks[0]).toHaveProperty('title')
      expect(subTasks[0]).toHaveProperty('status')
      expect(subTasks[0]).toHaveProperty('dependencyType')
    })

    test('should approve all Technical Refinement artifacts', async ({ page }) => {
      // Get all tech refinement artifacts
      const listResponse = await apiRequest(
        page,
        'GET',
        `/api/organizations/${TEST_ORG_ID}/workflows/${TEST_WORKFLOW_ID}/artifacts?phaseKey=technical_refinement`
      )
      const artifacts = await listResponse.json()

      // Approve each artifact
      for (const artifact of artifacts) {
        await apiRequest(page, 'POST', `/api/organizations/${TEST_ORG_ID}/artifacts/${artifact.id}/request-approval`)
        const approveResponse = await apiRequest(
          page,
          'POST',
          `/api/organizations/${TEST_ORG_ID}/artifacts/${artifact.id}/approve`
        )
        expect(approveResponse.ok()).toBeTruthy()
      }
    })

    test('should approve Technical Refinement phase', async ({ page }) => {
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/phases/technical_refinement/approve`
      )

      expect(response.ok()).toBeTruthy()
      const phase = await response.json()

      expect(phase.approvalStatus).toBe('APPROVED')
    })
  })

  test.describe('4. Implementation Phase', () => {
    test('should start implementation orchestration', async ({ page }) => {
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/implementation/start`
      )

      expect(response.ok()).toBeTruthy()
      const result = await response.json()

      expect(result).toHaveProperty('message')
      expect(result.message).toContain('started')
    })

    test('should get implementation status', async ({ page }) => {
      const response = await apiRequest(
        page,
        'GET',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/implementation/status`
      )

      expect(response.ok()).toBeTruthy()
      const status = await response.json()

      expect(status).toHaveProperty('totalTasks')
      expect(status).toHaveProperty('completedTasks')
      expect(status).toHaveProperty('inProgressTasks')
      expect(status).toHaveProperty('failedTasks')
    })

    test('should have implementation artifacts generated', async ({ page }) => {
      // Wait for implementation to complete (in real scenario, poll or use webhooks)
      await page.waitForTimeout(2000)

      const response = await apiRequest(
        page,
        'GET',
        `/api/organizations/${TEST_ORG_ID}/workflows/${TEST_WORKFLOW_ID}/artifacts?phaseKey=implementation`
      )

      expect(response.ok()).toBeTruthy()
      const artifacts = await response.json()

      expect(Array.isArray(artifacts)).toBeTruthy()
      // Implementation should generate reports per sub-task
    })
  })

  test.describe('5. Code Review Phase', () => {
    test('should start code review', async ({ page }) => {
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/code-review/start`
      )

      expect(response.ok()).toBeTruthy()
      const result = await response.json()

      expect(result).toHaveProperty('message')
    })

    test('should get code review report', async ({ page }) => {
      const response = await apiRequest(
        page,
        'GET',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/code-review/report`
      )

      expect(response.ok()).toBeTruthy()
      const report = await response.json()

      expect(report).toHaveProperty('findings')
      expect(report).toHaveProperty('statistics')
      expect(Array.isArray(report.findings)).toBeTruthy()
    })

    test('should have code review artifact', async ({ page }) => {
      const response = await apiRequest(
        page,
        'GET',
        `/api/organizations/${TEST_ORG_ID}/workflows/${TEST_WORKFLOW_ID}/artifacts?phaseKey=code_review`
      )

      expect(response.ok()).toBeTruthy()
      const artifacts = await response.json()

      const reviewArtifact = artifacts.find((a: any) => a.type === 'code-review-report')
      expect(reviewArtifact).toBeDefined()
    })
  })

  test.describe('6. QA Phase', () => {
    test('should start QA verification', async ({ page }) => {
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/qa/start`
      )

      expect(response.ok()).toBeTruthy()
      const result = await response.json()

      expect(result).toHaveProperty('overallStatus')
      expect(result).toHaveProperty('acceptanceCriteria')
    })

    test('should get QA report', async ({ page }) => {
      const response = await apiRequest(
        page,
        'GET',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/qa/report`
      )

      expect(response.ok()).toBeTruthy()
      const report = await response.json()

      expect(report).toHaveProperty('overallStatus')
      expect(report).toHaveProperty('acceptanceCriteria')
      expect(Array.isArray(report.acceptanceCriteria)).toBeTruthy()
    })
  })

  test.describe('7. Phase Approval Gates', () => {
    test('should NOT approve phase without approved artifacts', async ({ page }) => {
      // Try to approve a phase with unapproved artifacts (should fail)
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/phases/code_review/approve`
      )

      // Should fail because code review artifact is not approved
      expect(response.status()).toBeGreaterThanOrEqual(400)
    })

    test('should approve phase after all artifacts approved', async ({ page }) => {
      // Get and approve all code review artifacts
      const listResponse = await apiRequest(
        page,
        'GET',
        `/api/organizations/${TEST_ORG_ID}/workflows/${TEST_WORKFLOW_ID}/artifacts?phaseKey=code_review`
      )
      const artifacts = await listResponse.json()

      for (const artifact of artifacts) {
        await apiRequest(page, 'POST', `/api/organizations/${TEST_ORG_ID}/artifacts/${artifact.id}/request-approval`)
        await apiRequest(page, 'POST', `/api/organizations/${TEST_ORG_ID}/artifacts/${artifact.id}/approve`)
      }

      // Now approve phase
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/phases/code_review/approve`
      )

      expect(response.ok()).toBeTruthy()
    })
  })

  test.describe('8. Error Handling', () => {
    test('should return 404 for non-existent workflow', async ({ page }) => {
      const response = await apiRequest(
        page,
        'GET',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/non-existent-id`
      )

      expect(response.status()).toBe(404)
    })

    test('should return 400 for invalid phase transition', async ({ page }) => {
      // Try to start a phase that hasn't been unlocked yet
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/phases/rework/start`
      )

      expect(response.status()).toBeGreaterThanOrEqual(400)
    })

    test('should validate required fields in request body', async ({ page }) => {
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows`,
        {
          // Missing required fields
          title: '',
        }
      )

      expect(response.status()).toBeGreaterThanOrEqual(400)
    })
  })

  test.describe('9. Cleanup', () => {
    test('should be able to cancel workflow', async ({ page }) => {
      const response = await apiRequest(
        page,
        'POST',
        `/api/organizations/${TEST_ORG_ID}/projects/${TEST_PROJECT_ID}/workflows/${TEST_WORKFLOW_ID}/cancel`
      )

      expect(response.ok()).toBeTruthy()
      const workflow = await response.json()

      expect(workflow.status).toBe('CANCELLED')
    })
  })
})
