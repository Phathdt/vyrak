import { describe, it, expect, beforeEach, vi } from 'vitest'

import { ReworkOrchestratorService } from '../application/services/rework-orchestrator.service'

import type { ICodeReviewService } from '../domain/interfaces/code-review.interface'
import type { IQAVerificationService } from '../domain/interfaces/qa-verification.interface'
import type { IAIAgentService } from '@vyrak/ai-agent'
import type { IArtifactService } from '@vyrak/artifact'
import type { IConfigService } from '@vyrak/custom-config'
import type { EnhancedLogger } from '@vyrak/custom-logger'
import type { IWorkflowRepository, IWorkflowPhaseRepository } from '@vyrak/workflow-core'

describe('ReworkOrchestratorService', () => {
  let service: ReworkOrchestratorService
  let mockWorkflowRepo: IWorkflowRepository
  let mockPhaseRepo: IWorkflowPhaseRepository
  let mockCodeReviewService: ICodeReviewService
  let mockQAService: IQAVerificationService
  let mockArtifactService: IArtifactService
  let mockAIAgentService: IAIAgentService
  let mockConfigService: IConfigService
  let mockLogger: EnhancedLogger

  beforeEach(() => {
    mockWorkflowRepo = {
      findById: vi.fn(),
    } as unknown as IWorkflowRepository

    mockPhaseRepo = {
      findById: vi.fn(),
    } as unknown as IWorkflowPhaseRepository

    mockCodeReviewService = {
      startCodeReview: vi.fn(),
      getReport: vi.fn(),
    } as ICodeReviewService

    mockQAService = {
      startQA: vi.fn(),
      getQAReport: vi.fn(),
    } as IQAVerificationService

    mockArtifactService = {
      listWorkflowArtifacts: vi.fn(),
      listPhaseArtifacts: vi.fn(),
      downloadArtifact: vi.fn(),
      uploadArtifact: vi.fn(),
    } as unknown as IArtifactService

    mockAIAgentService = {
      runAgent: vi.fn(),
    } as unknown as IAIAgentService

    mockConfigService = {
      workspace: {
        workspacesPath: '/tmp/test-workspaces',
      },
    } as IConfigService

    mockLogger = {
      info: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as EnhancedLogger

    service = new ReworkOrchestratorService(
      mockWorkflowRepo,
      mockPhaseRepo,
      mockCodeReviewService,
      mockQAService,
      mockArtifactService,
      mockAIAgentService,
      mockConfigService,
      mockLogger
    )
  })

  it('should instantiate correctly', () => {
    expect(service).toBeDefined()
  })

  it('should load and prioritize findings correctly', async () => {
    const workflowId = 'workflow-123'
    const phaseId = 'phase-456'

    // Mock code review findings
    vi.mocked(mockCodeReviewService.getReport).mockResolvedValue({
      workflowId,
      phaseId,
      reviewedFiles: ['file1.ts'],
      findings: [
        {
          file: 'file1.ts',
          severity: 'HIGH',
          category: 'security',
          message: 'Security issue',
        },
        {
          file: 'file2.ts',
          severity: 'MEDIUM',
          category: 'quality',
          message: 'Code quality issue',
        },
      ],
      summary: {
        totalFindings: 2,
        criticalCount: 0,
        highCount: 1,
        mediumCount: 1,
        lowCount: 0,
        infoCount: 0,
      },
      reportContent: 'Report',
      completedAt: new Date(),
    })

    // Mock QA findings
    vi.mocked(mockQAService.getQAReport).mockResolvedValue({
      workflowId,
      phaseId,
      criteriaResults: [
        {
          criterion: 'Test criterion',
          status: 'fail',
          errorMessage: 'Test failed',
        },
      ],
      overallStatus: 'failed',
      executedAt: new Date(),
    })

    const findings = await service.loadAndPrioritizeFindings(workflowId, phaseId)

    expect(findings).toHaveLength(3)
    // Check priority order: HIGH > QA_FAILURE > MEDIUM
    expect(findings[0].severity).toBe('HIGH')
    expect(findings[1].severity).toBe('QA_FAILURE')
    expect(findings[2].severity).toBe('MEDIUM')
  })
})
