import { WorkflowPhaseStatus } from '../../domain'
import { buildDefinitionSnapshot, DEFAULT_WORKFLOW_PHASE_DEFINITIONS } from '../../domain/phase-definitions'

import type {
  IWorkflowPhaseRepository,
  IWorkflowPhaseService,
  IWorkflowRepository,
  WorkflowPhaseEntity,
  WorkflowType,
} from '../../domain'

export class WorkflowPhaseService implements IWorkflowPhaseService {
  constructor(
    private readonly workflowRepository: IWorkflowRepository,
    private readonly workflowPhaseRepository: IWorkflowPhaseRepository
  ) {}

  async listByWorkflowId(workflowId: string): Promise<WorkflowPhaseEntity[]> {
    return this.workflowPhaseRepository.findByWorkflowId(workflowId)
  }

  async initializePhasesForWorkflow(workflowId: string, workflowType: WorkflowType): Promise<WorkflowPhaseEntity[]> {
    const existing = await this.workflowPhaseRepository.findByWorkflowId(workflowId)
    if (existing.length > 0) {
      return existing
    }

    const snapshot = buildDefinitionSnapshot(workflowType)
    const created: WorkflowPhaseEntity[] = []

    for (const template of DEFAULT_WORKFLOW_PHASE_DEFINITIONS) {
      const phase = await this.workflowPhaseRepository.create(workflowId, {
        key: template.key,
        name: template.name,
        sequence: template.sequence,
        config: { workflowType },
      })
      created.push(phase)
    }

    const firstPhase = created[0]
    if (firstPhase) {
      await this.workflowPhaseRepository.updateStatus(firstPhase.id, WorkflowPhaseStatus.IN_PROGRESS)
      await this.workflowPhaseRepository.update(firstPhase.id, { startedAt: new Date() })
    }

    await this.workflowRepository.updateDefinitionContext(workflowId, {
      currentPhaseKey: firstPhase?.key ?? null,
      definitionSnapshot: snapshot,
    })

    return created
  }
}
