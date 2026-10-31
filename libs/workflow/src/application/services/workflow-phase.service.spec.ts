import { describe, expect, it, vi } from 'vitest'

import { WorkflowPhaseStatus, WorkflowType } from '../../domain'
import { WorkflowPhaseService } from './workflow-phase.service'

describe('WorkflowPhaseService', () => {
  it('creates default phases and starts Planning when none exist', async () => {
    const workflowRepository = {
      updateDefinitionContext: vi.fn().mockResolvedValue(undefined),
    }
    const workflowPhaseRepository = {
      findByWorkflowId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((_workflowId, data) =>
        Promise.resolve({
          id: `phase-${data.sequence}`,
          organizationId: 'org-1',
          workflowId: 'wf-1',
          key: data.key,
          name: data.name,
          sequence: data.sequence,
          status: WorkflowPhaseStatus.PENDING,
          config: data.config ?? null,
          input: null,
          output: null,
          error: null,
          startedAt: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
    }

    const service = new WorkflowPhaseService(workflowRepository as never, workflowPhaseRepository as never)

    const phases = await service.initializePhasesForWorkflow('wf-1', WorkflowType.STORY)

    expect(phases).toHaveLength(4)
    expect(workflowPhaseRepository.create).toHaveBeenCalledTimes(4)
    expect(workflowPhaseRepository.updateStatus).toHaveBeenCalledWith('phase-1', WorkflowPhaseStatus.IN_PROGRESS)
    expect(workflowRepository.updateDefinitionContext).toHaveBeenCalledWith(
      'wf-1',
      expect.objectContaining({ currentPhaseKey: 'planning' })
    )
  })

  it('is idempotent when phases already exist', async () => {
    const existing = [{ id: 'p1', key: 'planning', sequence: 1 }]
    const workflowPhaseRepository = {
      findByWorkflowId: vi.fn().mockResolvedValue(existing),
      create: vi.fn(),
    }

    const service = new WorkflowPhaseService(
      { updateDefinitionContext: vi.fn() } as never,
      workflowPhaseRepository as never
    )

    const phases = await service.initializePhasesForWorkflow('wf-1', WorkflowType.STORY)

    expect(phases).toBe(existing)
    expect(workflowPhaseRepository.create).not.toHaveBeenCalled()
  })
})
