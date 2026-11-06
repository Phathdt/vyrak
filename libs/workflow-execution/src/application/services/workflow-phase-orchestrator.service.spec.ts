import { describe, expect, it, vi } from 'vitest'

import { PhaseExecutionStatus, PhaseRunType } from '../../domain/schemas/phase-execution.schemas'
import { WorkflowPhaseOrchestratorService } from './workflow-phase-orchestrator.service'

const WORKFLOW_ID = 'workflow-1'

function createService(phaseKeys: string[]) {
  const workflowRepository = {
    findById: vi.fn().mockResolvedValue({ id: WORKFLOW_ID, organizationId: 'org-1', projectId: 'project-1' }),
  }
  const workflowPhaseRepository = {
    findByWorkflowId: vi.fn().mockResolvedValue(phaseKeys.map((key) => ({ id: `phase-${key}`, key, output: null }))),
    update: vi.fn().mockResolvedValue(undefined),
  }
  const conversationService = {
    getWorkflowSessions: vi.fn().mockResolvedValue([]),
    getMessages: vi.fn().mockResolvedValue([]),
  }
  const runPublisher = { enqueuePhaseRun: vi.fn().mockResolvedValue(undefined) }

  const service = new WorkflowPhaseOrchestratorService(
    workflowRepository as never,
    workflowPhaseRepository as never,
    conversationService as never,
    runPublisher as never
  )

  return { service, workflowPhaseRepository, runPublisher }
}

describe('WorkflowPhaseOrchestratorService', () => {
  it.each([
    ['implementation', PhaseRunType.IMPLEMENTATION],
    ['code-review', PhaseRunType.REVIEW],
    ['qa', PhaseRunType.QA],
  ])('enqueues a %s run with the matching run type', async (phaseKey, runType) => {
    const { service, workflowPhaseRepository, runPublisher } = createService([phaseKey])

    await service.startAutomationForPhase(WORKFLOW_ID, phaseKey)

    expect(runPublisher.enqueuePhaseRun).toHaveBeenCalledTimes(1)
    expect(runPublisher.enqueuePhaseRun).toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: WORKFLOW_ID, phaseKey, runType, phaseId: `phase-${phaseKey}` })
    )
    expect(workflowPhaseRepository.update).toHaveBeenCalledWith(
      `phase-${phaseKey}`,
      expect.objectContaining({
        output: expect.objectContaining({
          execution: expect.objectContaining({ status: PhaseExecutionStatus.RUNNING, runType }),
        }),
      })
    )
  })

  it('does nothing for a phase without automation', async () => {
    const { service, workflowPhaseRepository, runPublisher } = createService(['planning'])

    await service.startAutomationForPhase(WORKFLOW_ID, 'planning')

    expect(runPublisher.enqueuePhaseRun).not.toHaveBeenCalled()
    expect(workflowPhaseRepository.update).not.toHaveBeenCalled()
  })
})
