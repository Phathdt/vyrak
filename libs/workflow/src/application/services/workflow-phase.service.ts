import { BadRequestException, NotFoundException } from '@nestjs/common'

import { WorkflowPhaseStatus, WorkflowStatus, WorkflowType } from '../../domain'
import { buildDefinitionSnapshot, DEFAULT_WORKFLOW_PHASE_DEFINITIONS } from '../../domain/phase-definitions'

import type {
  AdvanceWorkflowPhaseResult,
  IWorkflowPhaseRepository,
  IWorkflowPhaseService,
  IWorkflowRepository,
  WorkflowPhaseEntity,
} from '../../domain'

type PhaseContext = {
  workflow: NonNullable<Awaited<ReturnType<IWorkflowRepository['findById']>>>
  sortedPhases: WorkflowPhaseEntity[]
  currentIndex: number
  currentPhase: WorkflowPhaseEntity
  currentKey: string
}

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

  async approveCurrentPhase(
    workflowId: string,
    approvedById: string,
    note?: string
  ): Promise<AdvanceWorkflowPhaseResult> {
    const ctx = await this.loadCurrentPhaseContext(workflowId)

    const workflowOk =
      ctx.workflow.status === WorkflowStatus.ACTIVE || ctx.workflow.status === WorkflowStatus.WAITING_APPROVAL
    if (!workflowOk) {
      throw new BadRequestException('Workflow cannot approve a phase in its current status')
    }

    const phaseOk =
      ctx.currentPhase.status === WorkflowPhaseStatus.IN_PROGRESS ||
      ctx.currentPhase.status === WorkflowPhaseStatus.WAITING_APPROVAL
    if (!phaseOk) {
      throw new BadRequestException('Current phase cannot be approved')
    }

    const approvedAt = new Date().toISOString()
    const output = {
      ...(ctx.currentPhase.output ?? {}),
      phaseApproval: {
        approvedAt,
        approvedById,
        note: note?.trim() || null,
      },
    }

    await this.workflowPhaseRepository.update(ctx.currentPhase.id, { output })

    if (ctx.workflow.status === WorkflowStatus.WAITING_APPROVAL) {
      await this.workflowRepository.updateStatus(workflowId, WorkflowStatus.ACTIVE)
    }

    return this.completeCurrentPhaseAndAdvance(ctx)
  }

  async sendBackToPhase(
    workflowId: string,
    targetPhaseKey: string,
    reason?: string
  ): Promise<AdvanceWorkflowPhaseResult> {
    const ctx = await this.loadCurrentPhaseContext(workflowId)

    if (ctx.workflow.status !== WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Workflow must be active to send back a phase')
    }

    const allowedFrom = new Set(['review', 'qc'])
    if (!allowedFrom.has(ctx.currentKey)) {
      throw new BadRequestException('Send-back is only supported from Review or QC')
    }

    const target = ctx.sortedPhases.find((p) => p.key === targetPhaseKey)
    if (!target) {
      throw new BadRequestException(`Target phase "${targetPhaseKey}" not found`)
    }

    if (target.sequence >= ctx.currentPhase.sequence) {
      throw new BadRequestException('Target phase must be earlier than the current phase')
    }

    const now = new Date()
    await this.workflowPhaseRepository.updateStatus(ctx.currentPhase.id, WorkflowPhaseStatus.PENDING)
    await this.workflowPhaseRepository.update(ctx.currentPhase.id, {
      input: {
        ...(ctx.currentPhase.input ?? {}),
        sendBack: { from: ctx.currentKey, reason: reason?.trim() || null, at: now.toISOString() },
      },
    })

    for (const phase of ctx.sortedPhases) {
      if (phase.sequence > target.sequence && phase.sequence <= ctx.currentPhase.sequence) {
        await this.workflowPhaseRepository.updateStatus(phase.id, WorkflowPhaseStatus.PENDING)
      }
    }

    await this.workflowPhaseRepository.updateStatus(target.id, WorkflowPhaseStatus.IN_PROGRESS)
    await this.workflowRepository.updateDefinitionContext(workflowId, {
      currentPhaseKey: targetPhaseKey,
      definitionSnapshot:
        ctx.workflow.definitionSnapshot ?? buildDefinitionSnapshot(ctx.workflow.type ?? WorkflowType.STORY),
    })

    const phases = await this.workflowPhaseRepository.findByWorkflowId(workflowId)

    return {
      previousPhaseKey: ctx.currentKey,
      currentPhaseKey: targetPhaseKey,
      workflowCompleted: false,
      phases,
    }
  }

  private async completeCurrentPhaseAndAdvance(ctx: PhaseContext): Promise<AdvanceWorkflowPhaseResult> {
    const { workflow, sortedPhases, currentIndex, currentPhase, currentKey, workflowId } = {
      ...ctx,
      workflowId: ctx.workflow.id,
    }

    const now = new Date()
    await this.workflowPhaseRepository.updateStatus(currentPhase.id, WorkflowPhaseStatus.COMPLETED)
    await this.workflowPhaseRepository.update(currentPhase.id, { completedAt: now })

    const nextPhase = sortedPhases[currentIndex + 1]
    let workflowCompleted = false
    let newCurrentKey: string | null = null

    if (nextPhase) {
      await this.workflowPhaseRepository.updateStatus(nextPhase.id, WorkflowPhaseStatus.IN_PROGRESS)
      await this.workflowPhaseRepository.update(nextPhase.id, { startedAt: now })
      newCurrentKey = nextPhase.key
      await this.workflowRepository.updateDefinitionContext(workflowId, {
        currentPhaseKey: newCurrentKey,
        definitionSnapshot: workflow.definitionSnapshot ?? buildDefinitionSnapshot(workflow.type ?? WorkflowType.STORY),
      })
      await this.workflowRepository.updateStatus(workflowId, WorkflowStatus.ACTIVE)
    } else {
      workflowCompleted = true
      await this.workflowRepository.updateDefinitionContext(workflowId, {
        currentPhaseKey: null,
        definitionSnapshot: workflow.definitionSnapshot ?? buildDefinitionSnapshot(workflow.type ?? WorkflowType.STORY),
      })
      await this.workflowRepository.updateStatus(workflowId, WorkflowStatus.COMPLETED)
    }

    const phases = await this.workflowPhaseRepository.findByWorkflowId(workflowId)

    return {
      previousPhaseKey: currentKey,
      currentPhaseKey: newCurrentKey,
      workflowCompleted,
      phases,
    }
  }

  private async loadCurrentPhaseContext(workflowId: string): Promise<PhaseContext> {
    const workflow = await this.workflowRepository.findById(workflowId)
    if (!workflow) {
      throw new NotFoundException('Workflow not found')
    }

    const currentKey = workflow.currentPhaseKey
    if (!currentKey) {
      throw new BadRequestException('Workflow has no current phase')
    }

    const phases = await this.workflowPhaseRepository.findByWorkflowId(workflowId)
    if (phases.length === 0) {
      throw new BadRequestException('Workflow phases are not initialized')
    }

    const sortedPhases = [...phases].sort((a, b) => a.sequence - b.sequence)
    const currentIndex = sortedPhases.findIndex((p) => p.key === currentKey)
    if (currentIndex < 0) {
      throw new BadRequestException(`Current phase "${currentKey}" was not found`)
    }

    return {
      workflow,
      sortedPhases,
      currentIndex,
      currentPhase: sortedPhases[currentIndex],
      currentKey,
    }
  }
}
