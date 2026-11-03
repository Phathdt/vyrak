import { ConversationPhase, IConversationService, MessageRole } from '@vyrak/conversation'
import { WorkflowNotFoundError } from '@vyrak/workflow-core'

import { PhaseExecutionStatus, PhaseRunType } from '../../domain/schemas/phase-execution.schemas'

import type { IWorkflowPhaseRunPublisher } from '../../domain/interfaces/workflow-phase-run-publisher.interface'
import type { PhaseExecutionMeta, WorkflowPhaseRunJob } from '../../domain/schemas/phase-execution.schemas'
import type { IWorkflowPhaseRepository, IWorkflowRepository } from '@vyrak/workflow-core'

const PHASE_RUN_TYPE: Record<string, PhaseRunType> = {
  implementation: PhaseRunType.IMPLEMENTATION,
  review: PhaseRunType.REVIEW,
  qc: PhaseRunType.QA,
}

export class WorkflowPhaseOrchestratorService {
  constructor(
    private readonly workflowRepository: IWorkflowRepository,
    private readonly workflowPhaseRepository: IWorkflowPhaseRepository,
    private readonly conversationService: IConversationService,
    private readonly runPublisher: IWorkflowPhaseRunPublisher
  ) {}

  async startAutomationForPhase(workflowId: string, phaseKey: string): Promise<void> {
    const runType = PHASE_RUN_TYPE[phaseKey]
    if (!runType) {
      return
    }

    const workflow = await this.workflowRepository.findById(workflowId)
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId)
    }

    const phases = await this.workflowPhaseRepository.findByWorkflowId(workflowId)
    const phase = phases.find((p) => p.key === phaseKey)
    if (!phase) {
      return
    }

    await this.ensurePlanningContext(workflowId)

    const now = new Date().toISOString()
    const execution: PhaseExecutionMeta = {
      status: PhaseExecutionStatus.RUNNING,
      runType,
      startedAt: now,
      updatedAt: now,
    }

    await this.workflowPhaseRepository.update(phase.id, {
      output: {
        ...(phase.output ?? {}),
        execution,
      },
    })

    const job: WorkflowPhaseRunJob = {
      organizationId: workflow.organizationId,
      workflowId,
      phaseId: phase.id,
      phaseKey,
      runType,
      metadata: {
        orgId: workflow.organizationId,
        projectId: workflow.projectId,
      },
    }

    await this.runPublisher.enqueuePhaseRun(job)
  }

  private async ensurePlanningContext(workflowId: string): Promise<void> {
    const sessions = await this.conversationService.getWorkflowSessions(workflowId)
    const planning = sessions.find((s) => s.phase === ConversationPhase.PLANNING)
    if (!planning) {
      return
    }
    const messages = await this.conversationService.getMessages(planning.id)
    const hasContent = messages.some((m) => m.role === MessageRole.USER || m.role === MessageRole.ASSISTANT)
    if (!hasContent) {
      // Agent run will still start; worker falls back to empty plan stub.
    }
  }
}
