import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { WorkflowState } from '../../domain/workflow-state'
import { WORKFLOW_REPOSITORY } from '../../infras/di/di'

import type { WorkflowRun } from '../../domain/entities/workflow-run.entity'
import type { IWorkflowRepository } from '../../domain/interfaces/workflow.repository.interface'

/**
 * Input for cancelling a workflow
 */
export interface CancelWorkflowInput {
  runId: string
  userId: string
  organizationId: string
  projectId: string
  reason?: string
}

/**
 * Use case: Cancel a running workflow
 *
 * Cancels an in-progress workflow execution. Only workflows in non-terminal
 * states can be cancelled.
 *
 * Terminal states (cannot be cancelled):
 * - COMPLETED
 * - FAILED
 * - CANCELLED
 * - REJECTED
 */
@Injectable()
export class CancelWorkflowUseCase {
  private readonly logger = new Logger(CancelWorkflowUseCase.name)

  constructor(
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: IWorkflowRepository
  ) {}

  async execute(input: CancelWorkflowInput): Promise<WorkflowRun> {
    const { runId, userId, organizationId, projectId, reason } = input

    // Fetch workflow run
    const run = await this.workflowRepo.findRunById(runId)
    if (!run) {
      throw new NotFoundException(`Workflow run ${runId} not found`)
    }

    // Verify ownership
    if (run.organizationId !== organizationId || run.projectId !== projectId) {
      throw new NotFoundException(`Workflow run ${runId} not found`)
    }

    // Check if workflow can be cancelled
    const terminalStates = [WorkflowState.SUCCEEDED, WorkflowState.FAILED, WorkflowState.CANCELLED]

    if (terminalStates.includes(run.state)) {
      throw new Error(`Workflow in state ${run.state} cannot be cancelled`)
    }

    // Cancel the workflow
    const cancellationReason = reason || 'User requested cancellation'

    await this.workflowRepo.updateRunState(runId, {
      status: WorkflowState.CANCELLED,
      cancellationReason,
      cancelledByUserId: userId,
      cancelledAt: new Date(),
    })

    this.logger.log('Workflow cancelled successfully', {
      runId,
      userId,
      organizationId,
      projectId,
      previousState: run.state,
      reason: cancellationReason,
    })

    // Fetch updated run
    const updatedRun = await this.workflowRepo.findRunById(runId)
    return updatedRun!
  }
}
