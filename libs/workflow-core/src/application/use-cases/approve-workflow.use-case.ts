import { Logger } from '@nestjs/common'

import { WorkflowState } from '../../domain'
import { approve, isPending } from '../../domain/entities/workflow-approval.entity'
import {
  ApprovalAlreadyDecidedError,
  StaleApprovalError,
  UnauthorizedAccessError,
  WorkflowApprovalNotFoundError,
  WorkflowRunNotFoundError,
} from '../../domain/errors'
import { InvalidWorkflowStateError } from '../../domain/errors/invalid-workflow-state.error'
import type { IAuthorizationService } from '../../domain/interfaces/authorization.interface'
import type { IEventRepository } from '../../domain/interfaces/event.repository.interface'
import type { IJobQueue } from '../../domain/interfaces/job-queue.interface'
import type { IWorkflowApprovalRepository } from '../../domain/interfaces/workflow-approval.repository.interface'
import type { IWorkflowRepository } from '../../domain/interfaces/workflow.repository.interface'
import { ApprovalValidatorService } from '../services/approval-validator.service'

/**
 * Input data for approving a workflow
 */
export interface ApproveWorkflowInput {
  runId: string
  userId: string
  organizationId: string
  projectId: string
  comment?: string
}

/**
 * Approve Workflow Use Case
 *
 * Plain TypeScript class (no @Injectable) following hexagonal architecture.
 * Handles the approval decision workflow with authorization, validation, state transitions,
 * and event emission.
 *
 * @see Phase 3: Approve Workflow Use Case (Story 4.2)
 */
export class ApproveWorkflowUseCase {
  private readonly logger = new Logger(ApproveWorkflowUseCase.name)

  constructor(
    private readonly workflowRunRepository: IWorkflowRepository,
    private readonly workflowApprovalRepository: IWorkflowApprovalRepository,
    private readonly approvalValidator: ApprovalValidatorService,
    private readonly authorizationService: IAuthorizationService,
    private readonly eventRepository: IEventRepository,
    private readonly jobQueue: IJobQueue
  ) {}

  /**
   * Execute the approval workflow
   *
   * @param input - Approval input data
   * @throws UnauthorizedAccessError if user lacks approval permission
   * @throws WorkflowRunNotFoundError if run not found
   * @throws InvalidWorkflowStateError if run not in waiting_approval state
   * @throws WorkflowApprovalNotFoundError if approval not found
   * @throws ApprovalAlreadyDecidedError if approval already decided by different user
   * @throws StaleApprovalError if plan has been regenerated
   */
  async execute(input: ApproveWorkflowInput): Promise<void> {
    try {
      // 1. Authorize user
      await this.authorizationService.requireApprovalPermission(input.userId, input.organizationId, input.projectId)

      // 2. Load run and verify state
      const run = await this.workflowRunRepository.findRunById(input.runId)
      if (!run) {
        throw new WorkflowRunNotFoundError(input.runId)
      }

      if (run.organizationId !== input.organizationId) {
        throw new UnauthorizedAccessError('Run does not belong to organization')
      }

      if (run.state !== WorkflowState.WAITING_APPROVAL) {
        throw new InvalidWorkflowStateError(`Expected waiting_approval, got ${run.state}`)
      }

      // 3. Load approval and verify state
      const approval = await this.workflowApprovalRepository.findByRunId(input.runId)
      if (!approval) {
        throw new WorkflowApprovalNotFoundError(input.runId)
      }

      if (!isPending(approval)) {
        // Idempotent: if already approved by same user, return success
        if (approval.status === 'approved' && approval.decidedByUserId === input.userId) {
          this.logger.log('Approval already applied', {
            runId: input.runId,
            approvalId: approval.id,
          })
          return
        }

        throw new ApprovalAlreadyDecidedError(approval.id)
      }

      // 4. Validate plan version hasn't changed (uses validator from Phase 2)
      const isValid = await this.approvalValidator.validatePlanVersion(approval.id, approval.planArtifactId)

      if (!isValid) {
        throw new StaleApprovalError('Plan has been regenerated or modified, approval is no longer valid')
      }

      // 5. Update approval using entity function (immutable)
      const approvedEntity = approve(approval, input.userId, input.comment)
      await this.workflowApprovalRepository.save(approvedEntity)

      // 6. Emit event
      await this.eventRepository.appendEvent({
        runId: input.runId,
        organizationId: input.organizationId,
        eventType: 'approval_decided',
        payload: {
          runId: input.runId,
          projectId: run.projectId,
          organizationId: input.organizationId,
          approvalId: approval.id,
          decision: 'approved',
          decidedByUserId: input.userId,
          decidedAt: new Date().toISOString(),
          comment: input.comment,
        },
      })

      // 7. Transition run to running
      await this.workflowRunRepository.updateRunState(input.runId, {
        status: WorkflowState.RUNNING,
      })

      // 8. Queue next step
      await this.jobQueue.enqueueWorkflowJob(run.id, run.organizationId)

      this.logger.log('Workflow approved', {
        runId: input.runId,
        approvalId: approval.id,
        approvedBy: input.userId,
      })
    } catch (error) {
      this.logger.error('Workflow approval failed', {
        runId: input.runId,
        userId: input.userId,
        error: error instanceof Error ? error.message : String(error),
      })

      throw error
    }
  }
}
