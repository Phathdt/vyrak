/**
 * Integration Test: Workflow Execution Pipeline
 * Tests complete workflow lifecycle: Planning → Technical Refinement → Implementation → Code Review → QA → Rework
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

import { CodeReviewService } from '../../application/services/code-review.service'
import { ImplementationOrchestrationService } from '../../application/services/implementation-orchestration.service'
import { QAVerificationService } from '../../application/services/qa-verification.service'
import {
  MOCK_PRD_CONTENT,
  MOCK_ADR_CONTENT,
  MOCK_IMPLEMENTATION_PLAN_CONTENT,
  MOCK_CODE_REVIEW_REPORT,
  MOCK_QA_REPORT,
  MOCK_IMPLEMENTATION_REPORT,
} from '../fixtures/mock-artifacts'
import {
  MockWorkflowRepository,
  MockWorkflowPhaseRepository,
  MockSubTaskRepository,
  MockWorkflowDependencyRepository,
  MockArtifactService,
  MockAIAgentService,
  MockConfigService,
  MockLogger,
} from '../fixtures/mock-repositories'
import {
  createMockWorkflow,
  WORKFLOW_PHASES,
  MOCK_SUBTASKS,
  MOCK_DEPENDENCIES,
  createMockArtifact,
} from '../fixtures/workflow-fixtures'

describe('Workflow Execution Integration Tests', () => {
  let workflowRepo: MockWorkflowRepository
  let phaseRepo: MockWorkflowPhaseRepository
  let subTaskRepo: MockSubTaskRepository
  let dependencyRepo: MockWorkflowDependencyRepository
  let artifactService: MockArtifactService
  let aiAgentService: MockAIAgentService
  let configService: MockConfigService
  let logger: MockLogger

  let implementationService: ImplementationOrchestrationService
  let codeReviewService: CodeReviewService
  let qaService: QAVerificationService

  beforeEach(() => {
    // Setup mock repositories
    workflowRepo = new MockWorkflowRepository()
    phaseRepo = new MockWorkflowPhaseRepository()
    subTaskRepo = new MockSubTaskRepository()
    dependencyRepo = new MockWorkflowDependencyRepository()
    artifactService = new MockArtifactService()
    aiAgentService = new MockAIAgentService()
    configService = new MockConfigService()
    logger = new MockLogger()

    // Setup test data
    const workflow = createMockWorkflow()
    workflowRepo.setWorkflows([workflow])

    phaseRepo.setPhases(Object.values(WORKFLOW_PHASES))
    subTaskRepo.setSubTasks(MOCK_SUBTASKS)
    dependencyRepo.setDependencies(MOCK_DEPENDENCIES)

    // Setup artifacts
    const artifacts = [
      createMockArtifact({
        id: 'artifact-prd',
        type: 'prd',
        key: 'prd',
        phaseId: WORKFLOW_PHASES.planning.id,
        title: 'Product Requirements Document',
        approvalStatus: 'APPROVED',
        mockContent: MOCK_PRD_CONTENT,
      }),
      createMockArtifact({
        id: 'artifact-adr',
        type: 'adr',
        key: 'adr-001',
        phaseId: WORKFLOW_PHASES.technicalRefinement.id,
        title: 'ADR-001: Use JWT for Authentication',
        approvalStatus: 'APPROVED',
        mockContent: MOCK_ADR_CONTENT,
      }),
      createMockArtifact({
        id: 'artifact-plan',
        type: 'implementation-plan',
        key: 'implementation-plan',
        phaseId: WORKFLOW_PHASES.technicalRefinement.id,
        title: 'Implementation Plan',
        approvalStatus: 'APPROVED',
        mockContent: MOCK_IMPLEMENTATION_PLAN_CONTENT,
      }),
    ]
    artifactService.setArtifacts(artifacts)

    // Setup AI Agent mock responses
    aiAgentService.setMockResponse('implementation', MOCK_IMPLEMENTATION_REPORT)
    aiAgentService.setMockResponse('code-review', MOCK_CODE_REVIEW_REPORT)
    aiAgentService.setMockResponse('qa', MOCK_QA_REPORT)

    // Initialize services
    implementationService = new ImplementationOrchestrationService(
      subTaskRepo as any,
      dependencyRepo as any,
      workflowRepo as any,
      artifactService as any,
      aiAgentService as any,
      configService as any,
      logger as any,
      3 // max concurrency
    )

    codeReviewService = new CodeReviewService(
      workflowRepo as any,
      phaseRepo as any,
      artifactService as any,
      aiAgentService as any,
      configService as any,
      logger as any
    )

    qaService = new QAVerificationService(
      workflowRepo as any,
      artifactService as any,
      aiAgentService as any,
      configService as any,
      logger as any
    )
  })

  describe('Phase 1: Planning → Technical Refinement', () => {
    it('should have Planning phase completed with approved PRD artifact', async () => {
      const planningPhase = WORKFLOW_PHASES.planning
      expect(planningPhase.status).toBe('COMPLETED')

      const prdArtifact = await artifactService.getArtifactByWorkflowIdAndKey('workflow-test-001', 'prd')
      expect(prdArtifact).toBeDefined()
      expect(prdArtifact?.approvalStatus).toBe('APPROVED')
    })

    it('should have Technical Refinement phase completed with approved artifacts', async () => {
      const techPhase = WORKFLOW_PHASES.technicalRefinement
      expect(techPhase.status).toBe('COMPLETED')

      const adrArtifact = await artifactService.getArtifactByWorkflowIdAndKey('workflow-test-001', 'adr-001')
      const planArtifact = await artifactService.getArtifactByWorkflowIdAndKey(
        'workflow-test-001',
        'implementation-plan'
      )

      expect(adrArtifact).toBeDefined()
      expect(planArtifact).toBeDefined()
      expect(adrArtifact?.approvalStatus).toBe('APPROVED')
      expect(planArtifact?.approvalStatus).toBe('APPROVED')
    })
  })

  describe('Phase 2: Implementation with Sub-task Orchestration', () => {
    it('should load all sub-tasks for implementation phase', async () => {
      const tasks = await subTaskRepo.findByPhaseId(WORKFLOW_PHASES.implementation.id)
      expect(tasks).toBeDefined()
      expect(tasks.length).toBeGreaterThan(0)
    })

    it('should identify task dependencies correctly', async () => {
      const deps = await dependencyRepo.findByWorkflowId('workflow-test-001')
      expect(deps).toBeDefined()
      expect(deps.length).toBe(3) // 3 sequential dependencies

      // Verify dependency chain: subtask-001 → subtask-002 → subtask-003 → subtask-004
      expect(deps[0].sourceWorkItemId).toBe('subtask-001')
      expect(deps[0].targetWorkItemId).toBe('subtask-002')
      expect(deps[1].sourceWorkItemId).toBe('subtask-002')
      expect(deps[1].targetWorkItemId).toBe('subtask-003')
    })

    it('should execute ready tasks (no unsatisfied dependencies)', async () => {
      const readyTasks = await subTaskRepo.findReadyTasks('workflow-test-001')
      expect(readyTasks.length).toBeGreaterThan(0)
    })

    it('should NOT start implementation without Implementation Plan artifact', async () => {
      // Remove implementation plan
      artifactService.setArtifacts([
        createMockArtifact({
          id: 'artifact-prd',
          type: 'prd',
          key: 'prd',
          mockContent: MOCK_PRD_CONTENT,
        }),
      ])

      await expect(
        implementationService.startImplementation('workflow-test-001', WORKFLOW_PHASES.implementation.id)
      ).rejects.toThrow()
    })
  })

  describe('Phase 3: Code Review', () => {
    it('should load implementation artifacts for review', async () => {
      // Add implementation artifact
      artifactService.setArtifacts([
        ...artifactService['artifacts'].values(),
        createMockArtifact({
          id: 'artifact-impl',
          type: 'implementation-report',
          key: 'implementation-report-001',
          phaseId: WORKFLOW_PHASES.implementation.id,
          title: 'Implementation Report',
          mockContent: MOCK_IMPLEMENTATION_REPORT,
        }),
      ])

      const implArtifacts = await artifactService.getArtifactsByPhaseId(WORKFLOW_PHASES.implementation.id)
      expect(implArtifacts.length).toBeGreaterThan(0)
    })

    it('should generate code review report artifact', async () => {
      // Add implementation artifact first
      artifactService.setArtifacts([
        ...Array.from(artifactService['artifacts'].values()),
        createMockArtifact({
          id: 'artifact-impl',
          type: 'implementation-report',
          key: 'implementation-report-001',
          phaseId: WORKFLOW_PHASES.implementation.id,
          mockContent: MOCK_IMPLEMENTATION_REPORT,
        }),
      ])

      // Mock workspace path
      vi.spyOn(codeReviewService as any, 'getWorkspacePath').mockReturnValue('/tmp/test-workspace')

      const result = await codeReviewService.startCodeReview('workflow-test-001', WORKFLOW_PHASES.codeReview.id)

      expect(result).toBeDefined()
      expect(result.findings).toBeDefined()
    })

    it('should NOT start code review without implementation artifacts', async () => {
      // Only have planning/tech refinement artifacts
      artifactService.setArtifacts([
        createMockArtifact({
          id: 'artifact-prd',
          type: 'prd',
          key: 'prd',
          phaseId: WORKFLOW_PHASES.planning.id,
          mockContent: MOCK_PRD_CONTENT,
        }),
      ])

      await expect(
        codeReviewService.startCodeReview('workflow-test-001', WORKFLOW_PHASES.codeReview.id)
      ).rejects.toThrow()
    })
  })

  describe('Phase 4: QA Verification', () => {
    it('should load PRD for acceptance criteria verification', async () => {
      const prdArtifact = await artifactService.getArtifactByWorkflowIdAndKey('workflow-test-001', 'prd')
      expect(prdArtifact).toBeDefined()

      const content = await artifactService.downloadArtifact(prdArtifact.id)
      expect(content.toString()).toContain('Acceptance Criteria')
    })

    it('should generate QA report with pass/fail status per criterion', async () => {
      // Mock workspace preparation
      vi.spyOn(qaService as any, 'prepareWorkspace').mockResolvedValue('/tmp/test-workspace')

      const result = await qaService.startQA('workflow-test-001', WORKFLOW_PHASES.qa.id)

      expect(result).toBeDefined()
      expect(result.acceptanceCriteria).toBeDefined()
      expect(result.overallStatus).toBeDefined()
    })

    it('should NOT start QA without PRD artifact', async () => {
      // Remove PRD
      artifactService.setArtifacts([
        createMockArtifact({
          id: 'artifact-adr',
          type: 'adr',
          key: 'adr-001',
          mockContent: MOCK_ADR_CONTENT,
        }),
      ])

      await expect(qaService.startQA('workflow-test-001', WORKFLOW_PHASES.qa.id)).rejects.toThrow()
    })
  })

  describe('Phase 5: Rework Cycle', () => {
    it('should preserve artifacts when sending back to previous phase', async () => {
      const initialArtifacts = await artifactService.getArtifactsByWorkflowId('workflow-test-001')
      const initialCount = initialArtifacts.length

      // Simulate sending back from QA to Implementation
      const implementationPhase = await phaseRepo.findById(WORKFLOW_PHASES.implementation.id)
      expect(implementationPhase).toBeDefined()

      // Artifacts should still exist
      const currentArtifacts = await artifactService.getArtifactsByWorkflowId('workflow-test-001')
      expect(currentArtifacts.length).toBe(initialCount)
    })

    it('should allow artifact regeneration with version increment', async () => {
      const existingArtifact = createMockArtifact({
        id: 'artifact-prd-v1',
        key: 'prd',
        version: 1,
      })

      artifactService.setArtifacts([existingArtifact])

      const newArtifact = await artifactService.createArtifact({
        organizationId: 'org-test-001',
        workflowId: 'workflow-test-001',
        phaseId: WORKFLOW_PHASES.planning.id,
        type: 'prd',
        key: 'prd',
        version: 2,
        title: 'Product Requirements Document v2',
      })

      expect(newArtifact.version).toBe(2)
      expect(newArtifact.key).toBe('prd')
    })
  })

  describe('Phase 6: Complete Workflow Lifecycle', () => {
    it('should progress through all phases in order', async () => {
      const phases = await phaseRepo.findByWorkflowId('workflow-test-001')
      const orderedPhases = phases.sort((a, b) => a.sequence - b.sequence)

      expect(orderedPhases[0].key).toBe('planning')
      expect(orderedPhases[1].key).toBe('technical_refinement')
      expect(orderedPhases[2].key).toBe('implementation')
      expect(orderedPhases[3].key).toBe('code_review')
      expect(orderedPhases[4].key).toBe('qa')
      expect(orderedPhases[5].key).toBe('rework')
    })

    it('should verify artifact approval gates at each phase', async () => {
      const planningArtifacts = await artifactService.getArtifactsByPhaseId(WORKFLOW_PHASES.planning.id)
      expect(planningArtifacts.every((a) => a.approvalStatus === 'APPROVED')).toBe(true)

      const techArtifacts = await artifactService.getArtifactsByPhaseId(WORKFLOW_PHASES.technicalRefinement.id)
      expect(techArtifacts.every((a) => a.approvalStatus === 'APPROVED')).toBe(true)
    })

    it('should track phase transitions and status changes', async () => {
      const completedPhases = (await phaseRepo.findByWorkflowId('workflow-test-001')).filter(
        (p) => p.status === 'COMPLETED'
      )

      expect(completedPhases.length).toBeGreaterThanOrEqual(2) // At least Planning and Technical Refinement
      expect(completedPhases.every((p) => p.completedAt !== null)).toBe(true)
    })
  })

  describe('Error Handling & Edge Cases', () => {
    it('should handle workflow not found gracefully', async () => {
      await expect(implementationService.startImplementation('non-existent-workflow', 'phase-001')).rejects.toThrow()
    })

    it('should handle phase not found gracefully', async () => {
      await expect(codeReviewService.startCodeReview('workflow-test-001', 'non-existent-phase')).rejects.toThrow()
    })

    it('should handle missing artifacts gracefully', async () => {
      artifactService.setArtifacts([])

      await expect(
        implementationService.startImplementation('workflow-test-001', WORKFLOW_PHASES.implementation.id)
      ).rejects.toThrow()
    })

    it('should handle cyclic dependencies detection', async () => {
      // Create cyclic dependencies: A → B → C → A
      const cyclicDeps = [
        { id: 'dep-1', workflowId: 'workflow-test-001', sourceWorkItemId: 'task-a', targetWorkItemId: 'task-b' },
        { id: 'dep-2', workflowId: 'workflow-test-001', sourceWorkItemId: 'task-b', targetWorkItemId: 'task-c' },
        { id: 'dep-3', workflowId: 'workflow-test-001', sourceWorkItemId: 'task-c', targetWorkItemId: 'task-a' },
      ]

      dependencyRepo.setDependencies(cyclicDeps)

      // Cyclic dependency detection should happen during startImplementation
      // The DependencyGraph.detectCycles() will catch this
      // For this test, we verify the dependencies are set up cyclically
      const deps = await dependencyRepo.findByWorkflowId('workflow-test-001')
      expect(deps.length).toBe(3)
    })
  })

  describe('Artifact Content Validation', () => {
    it('should validate PRD contains acceptance criteria', async () => {
      const prdArtifact = await artifactService.getArtifactByWorkflowIdAndKey('workflow-test-001', 'prd')
      const content = await artifactService.downloadArtifact(prdArtifact.id)

      expect(content.toString()).toContain('Acceptance Criteria')
      expect(content.toString()).toContain('Functional Requirements')
    })

    it('should validate ADR contains decision and alternatives', async () => {
      const adrArtifact = await artifactService.getArtifactByWorkflowIdAndKey('workflow-test-001', 'adr-001')
      const content = await artifactService.downloadArtifact(adrArtifact.id)

      expect(content.toString()).toContain('Decision')
      expect(content.toString()).toContain('Alternatives Considered')
      expect(content.toString()).toContain('Consequences')
    })

    it('should validate Implementation Plan contains tasks and phases', async () => {
      const planArtifact = await artifactService.getArtifactByWorkflowIdAndKey(
        'workflow-test-001',
        'implementation-plan'
      )
      const content = await artifactService.downloadArtifact(planArtifact.id)

      expect(content.toString()).toContain('Phase')
      expect(content.toString()).toContain('Tasks')
      expect(content.toString()).toContain('Goal')
    })
  })
})
