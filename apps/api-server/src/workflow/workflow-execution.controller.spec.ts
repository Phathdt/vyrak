import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkflowExecutionController } from './workflow-execution.controller'

vi.mock('@vyrak/workflow-execution', () => ({
  WORKFLOW_EXECUTION_QUERY_SERVICE: Symbol('WORKFLOW_EXECUTION_QUERY_SERVICE'),
  WorkflowPhaseOrchestratorService: class WorkflowPhaseOrchestratorService {},
}))

vi.mock('@vyrak/workflow-core', () => ({
  WORKFLOW_PHASE_REPOSITORY: Symbol('WORKFLOW_PHASE_REPOSITORY'),
}))

vi.mock('../auth', () => ({ AuthGuard: class AuthGuard {} }))
vi.mock('../guards', () => ({ OrganizationMemberGuard: class OrganizationMemberGuard {} }))

const WORKFLOW_ID = '11111111-1111-4111-8111-111111111111'
const PHASES = [
  { id: 'phase-impl', key: 'implementation' },
  { id: 'phase-review', key: 'code-review' },
  { id: 'phase-qa', key: 'qa' },
]

describe('WorkflowExecutionController', () => {
  let orchestrator: { startAutomationForPhase: ReturnType<typeof vi.fn> }
  let executionQuery: {
    getImplementationStatus: ReturnType<typeof vi.fn>
    getCodeReviewReport: ReturnType<typeof vi.fn>
    getQAReport: ReturnType<typeof vi.fn>
  }
  let phaseRepository: { findByWorkflowId: ReturnType<typeof vi.fn> }
  let controller: WorkflowExecutionController

  beforeEach(() => {
    orchestrator = { startAutomationForPhase: vi.fn().mockResolvedValue(undefined) }
    executionQuery = {
      getImplementationStatus: vi.fn().mockResolvedValue({
        workflowId: WORKFLOW_ID,
        phaseId: 'phase-impl',
        totalTasks: 4,
        completedTasks: 1,
        failedTasks: 0,
        inProgressTasks: 1,
        pendingTasks: 2,
        readyTasks: 0,
        tasks: [],
      }),
      getCodeReviewReport: vi.fn(),
      getQAReport: vi.fn(),
    }
    phaseRepository = { findByWorkflowId: vi.fn().mockResolvedValue(PHASES) }

    controller = new WorkflowExecutionController(
      orchestrator as never,
      executionQuery as never,
      phaseRepository as never
    )
  })

  describe('implementation/start', () => {
    it('enqueues the implementation run through the orchestrator and returns the task count', async () => {
      const result = await controller.startImplementation('org', 'project', WORKFLOW_ID)

      expect(orchestrator.startAutomationForPhase).toHaveBeenCalledTimes(1)
      expect(orchestrator.startAutomationForPhase).toHaveBeenCalledWith(WORKFLOW_ID, 'implementation')
      expect(result).toEqual({
        message: 'Implementation job queued',
        workflowId: WORKFLOW_ID,
        phaseId: 'phase-impl',
        totalTasks: 4,
      })
    })

    it('does not enqueue when the implementation phase does not exist', async () => {
      phaseRepository.findByWorkflowId.mockResolvedValue([])

      await expect(controller.startImplementation('org', 'project', WORKFLOW_ID)).rejects.toThrow(
        'Implementation phase not found'
      )
      expect(orchestrator.startAutomationForPhase).not.toHaveBeenCalled()
    })

    it('propagates enqueue failures instead of reporting success', async () => {
      orchestrator.startAutomationForPhase.mockRejectedValue(new Error('redis unavailable'))

      await expect(controller.startImplementation('org', 'project', WORKFLOW_ID)).rejects.toThrow('redis unavailable')
    })
  })

  describe('code-review/start', () => {
    it('enqueues the code-review run through the orchestrator', async () => {
      const result = await controller.startCodeReview('org', 'project', WORKFLOW_ID)

      expect(orchestrator.startAutomationForPhase).toHaveBeenCalledWith(WORKFLOW_ID, 'code-review')
      expect(result).toEqual({ message: 'Code review job queued', workflowId: WORKFLOW_ID, phaseId: 'phase-review' })
    })

    it('does not enqueue when the code-review phase does not exist', async () => {
      phaseRepository.findByWorkflowId.mockResolvedValue([PHASES[0]])

      await expect(controller.startCodeReview('org', 'project', WORKFLOW_ID)).rejects.toThrow(
        'Code Review phase not found'
      )
      expect(orchestrator.startAutomationForPhase).not.toHaveBeenCalled()
    })
  })

  describe('qa/start', () => {
    it('enqueues the QA run and returns RUNNING without waiting for a result', async () => {
      const result = await controller.startQA('org', 'project', WORKFLOW_ID)

      expect(orchestrator.startAutomationForPhase).toHaveBeenCalledWith(WORKFLOW_ID, 'qa')
      expect(result).toEqual({ status: 'RUNNING' })
      expect(executionQuery.getQAReport).not.toHaveBeenCalled()
    })

    it('does not enqueue when the QA phase does not exist', async () => {
      phaseRepository.findByWorkflowId.mockResolvedValue([])

      await expect(controller.startQA('org', 'project', WORKFLOW_ID)).rejects.toThrow('QA phase not found')
      expect(orchestrator.startAutomationForPhase).not.toHaveBeenCalled()
    })
  })

  it('has no retry endpoint', () => {
    expect((controller as unknown as Record<string, unknown>).retryTask).toBeUndefined()
  })

  describe('read endpoints', () => {
    it('implementation/status maps sub-tasks and never enqueues', async () => {
      executionQuery.getImplementationStatus.mockResolvedValue({
        workflowId: WORKFLOW_ID,
        phaseId: 'phase-impl',
        totalTasks: 1,
        completedTasks: 0,
        failedTasks: 0,
        inProgressTasks: 0,
        pendingTasks: 1,
        readyTasks: 0,
        tasks: [
          {
            id: 't1',
            key: 'task-01',
            title: 'Task',
            description: null,
            status: 'PENDING',
            dependencyType: 'INDEPENDENT',
            executionOrder: 1,
          },
        ],
      })

      const result = await controller.getImplementationStatus('org', 'project', WORKFLOW_ID)

      expect(result.tasks).toEqual([
        {
          id: 't1',
          key: 'task-01',
          title: 'Task',
          description: '',
          status: 'PENDING',
          dependencyType: 'INDEPENDENT',
          executionOrder: 1,
        },
      ])
      expect(orchestrator.startAutomationForPhase).not.toHaveBeenCalled()
    })

    it('code-review/report serializes completedAt as an ISO string', async () => {
      const completedAt = new Date('2026-11-05T10:00:00.000Z')
      executionQuery.getCodeReviewReport.mockResolvedValue({
        workflowId: WORKFLOW_ID,
        phaseId: 'phase-review',
        reviewedFiles: ['a.ts'],
        findings: [{ file: 'a.ts', severity: 'HIGH', category: 'security', message: 'm' }],
        summary: { totalFindings: 1, criticalCount: 0, highCount: 1, mediumCount: 0, lowCount: 0, infoCount: 0 },
        reportContent: '',
        artifactId: 'artifact-1',
        completedAt,
      })

      const result = await controller.getCodeReviewReport('org', 'project', WORKFLOW_ID)

      expect(executionQuery.getCodeReviewReport).toHaveBeenCalledWith(WORKFLOW_ID, 'phase-review')
      expect(result.completedAt).toBe('2026-11-05T10:00:00.000Z')
      expect(result.summary.highCount).toBe(1)
    })

    it('code-review/report fails when no report exists', async () => {
      executionQuery.getCodeReviewReport.mockResolvedValue(null)

      await expect(controller.getCodeReviewReport('org', 'project', WORKFLOW_ID)).rejects.toThrow(
        'Code review report not found'
      )
    })

    it('qa/report serializes executedAt as an ISO string', async () => {
      executionQuery.getQAReport.mockResolvedValue({
        workflowId: WORKFLOW_ID,
        phaseId: 'phase-qa',
        reportArtifactId: 'artifact-2',
        criteriaResults: [{ criterion: 'c', status: 'pass' }],
        overallStatus: 'passed',
        executedAt: new Date('2026-11-05T11:00:00.000Z'),
      })

      const result = await controller.getQAReport('org', 'project', WORKFLOW_ID)

      expect(executionQuery.getQAReport).toHaveBeenCalledWith(WORKFLOW_ID, 'phase-qa')
      expect(result.executedAt).toBe('2026-11-05T11:00:00.000Z')
      expect(result.overallStatus).toBe('passed')
    })

    it('qa/report fails when no report exists', async () => {
      executionQuery.getQAReport.mockResolvedValue(null)

      await expect(controller.getQAReport('org', 'project', WORKFLOW_ID)).rejects.toThrow('QA report not found')
    })
  })
})
