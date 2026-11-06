import { describe, expect, it, vi } from 'vitest'

import { WorkflowExecutionQueryService } from './workflow-execution-query.service'

const WORKFLOW_ID = 'workflow-1'
const PHASE_ID = 'phase-1'

function createService(overrides: { tasks?: Array<{ status: string }>; artifacts?: unknown[]; content?: string } = {}) {
  const subTaskRepository = { findByPhaseId: vi.fn().mockResolvedValue(overrides.tasks ?? []) }
  const artifactService = {
    listPhaseArtifacts: vi.fn().mockResolvedValue(overrides.artifacts ?? []),
    downloadArtifact: vi.fn().mockResolvedValue({ content: overrides.content ?? '' }),
  }
  const logger = { warn: vi.fn() }

  const service = new WorkflowExecutionQueryService(
    subTaskRepository as never,
    artifactService as never,
    logger as never
  )
  return { service, subTaskRepository, artifactService, logger }
}

describe('WorkflowExecutionQueryService', () => {
  describe('getImplementationStatus', () => {
    it('counts sub-tasks by status and folds waiting and blocked into pending', async () => {
      const { service, subTaskRepository } = createService({
        tasks: [
          { status: 'COMPLETED' },
          { status: 'COMPLETED' },
          { status: 'FAILED' },
          { status: 'IN_PROGRESS' },
          { status: 'READY' },
          { status: 'PENDING' },
          { status: 'WAITING_DEPENDENCY' },
          { status: 'BLOCKED' },
        ],
      })

      const status = await service.getImplementationStatus(WORKFLOW_ID, PHASE_ID)

      expect(subTaskRepository.findByPhaseId).toHaveBeenCalledWith(PHASE_ID)
      expect(status).toMatchObject({
        workflowId: WORKFLOW_ID,
        phaseId: PHASE_ID,
        totalTasks: 8,
        completedTasks: 2,
        failedTasks: 1,
        inProgressTasks: 1,
        readyTasks: 1,
        pendingTasks: 3,
      })
      expect(status.tasks).toHaveLength(8)
    })

    it('returns zero counts when the phase has no sub-tasks', async () => {
      const { service } = createService()

      const status = await service.getImplementationStatus(WORKFLOW_ID, PHASE_ID)

      expect(status.totalTasks).toBe(0)
      expect(status.pendingTasks).toBe(0)
    })
  })

  describe('getCodeReviewReport', () => {
    it('returns null when the phase has no review artifact', async () => {
      const { service, artifactService } = createService({
        artifacts: [{ id: 'a1', type: 'prd', key: 'prd', createdAt: new Date() }],
      })

      await expect(service.getCodeReviewReport(WORKFLOW_ID, PHASE_ID)).resolves.toBeNull()
      expect(artifactService.downloadArtifact).not.toHaveBeenCalled()
    })

    it('parses findings and summary from the stored report', async () => {
      const createdAt = new Date('2026-11-05T10:00:00.000Z')
      const { service, artifactService } = createService({
        artifacts: [{ id: 'review-1', type: 'code-review-report', key: 'code-review', createdAt }],
        content: '### HIGH\n- src/auth.ts: Missing authentication check\n',
      })

      const report = await service.getCodeReviewReport(WORKFLOW_ID, PHASE_ID)

      expect(artifactService.downloadArtifact).toHaveBeenCalledWith('review-1')
      expect(report).toMatchObject({
        workflowId: WORKFLOW_ID,
        phaseId: PHASE_ID,
        artifactId: 'review-1',
        completedAt: createdAt,
      })
      expect(report?.findings).toEqual([
        { file: 'src/auth.ts', severity: 'HIGH', category: 'security', message: 'Missing authentication check' },
      ])
      expect(report?.summary).toMatchObject({ totalFindings: 1, highCount: 1, criticalCount: 0 })
    })

    it('propagates artifact storage errors', async () => {
      const { service, artifactService } = createService({
        artifacts: [{ id: 'review-1', type: 'code-review-report', key: 'code-review', createdAt: new Date() }],
      })
      artifactService.downloadArtifact.mockRejectedValue(new Error('s3 unavailable'))

      await expect(service.getCodeReviewReport(WORKFLOW_ID, PHASE_ID)).rejects.toThrow('s3 unavailable')
    })
  })

  describe('getQAReport', () => {
    it('returns null when the phase has no QA artifact', async () => {
      const { service } = createService()

      await expect(service.getQAReport(WORKFLOW_ID, PHASE_ID)).resolves.toBeNull()
    })

    it('returns a reference to the stored QA report artifact', async () => {
      const createdAt = new Date('2026-11-05T11:00:00.000Z')
      const { service } = createService({
        artifacts: [{ id: 'qa-1', type: 'qa-report', key: 'qa-report', createdAt }],
      })

      const report = await service.getQAReport(WORKFLOW_ID, PHASE_ID)

      expect(report).toMatchObject({
        workflowId: WORKFLOW_ID,
        phaseId: PHASE_ID,
        reportArtifactId: 'qa-1',
        executedAt: createdAt,
      })
    })

    it('logs and returns null when the artifact lookup fails', async () => {
      const { service, artifactService, logger } = createService()
      artifactService.listPhaseArtifacts.mockRejectedValue(new Error('db down'))

      await expect(service.getQAReport(WORKFLOW_ID, PHASE_ID)).resolves.toBeNull()
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('db down'))
    })
  })
})
