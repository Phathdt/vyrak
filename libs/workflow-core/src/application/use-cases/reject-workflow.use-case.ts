import * as approvalEntity from '../../domain/entities/workflow-approval.entity'
import {
  ApprovalAlreadyDecidedError,
  InvalidInputException,
  InvalidWorkflowStateError,
  UnauthorizedAccessError,
  WorkflowApprovalNotFoundError,
  WorkflowRunNotFoundError,
} from '../../domain/errors'
import type { IAuthorizationService } from '../../domain/interfaces/authorization.interface'
import type { IEventRepository } from '../../domain/interfaces/event.repository.interface'
import type { IWorkflowApprovalRepository } from '../../domain/interfaces/workflow-approval.repository.interface'
import type { IWorkflowRepository } from '../../domain/interfaces/workflow.repository.interface'
import { WorkflowState } from '../../domain/workflow-state'

/**
 * Logger interface for reject workflow use case
 */
export interface IRejectWorkflowLogger {
  info(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
}

/**
 * Input for rejecting a workflow
 */
export interface RejectWorkflowInput {
  runId: string
  userId: string
  organizationId: string
  projectId: string
  comment: string // Required for rejection
}

/**
 * Use case for rejecting a pending workflow approval
 *
 * Responsibilities:
 * - Validate user has approval permission (authorization check)
 * - Verify run is in waiting_approval state
 * - Require rejection comment (mandatory feedback)
 * - Update approval: status=rejected, decidedByUserId, decidedAt, comment
 * - Emit approval_decided event with rejection reason
 * - Transition run to cancelled state
 * - Do not queue next step (workflow terminates)
 * - Record cancellation metadata (userId, timestamp, reason)
 */
export class RejectWorkflowUseCase {
  constructor(
    private readonly workflowRunRepository: IWorkflowRepository,
    private readonly workflowApprovalRepository: IWorkflowApprovalRepository,
    private readonly authorizationService: IAuthorizationService,
    private readonly eventRepository: IEventRepository,
    private readonly logger: IRejectWorkflowLogger
  ) {}

  /**
   * Execute the reject workflow use case
   *
   * @param input - Parameters for rejecting the workflow
   * @throws InvalidInputException if comment is empty
   * @throws UnauthorizedAccessError if user lacks permission
   * @throws WorkflowRunNotFoundError if run not found
   * @throws InvalidWorkflowStateError if run not in waiting_approval state
   * @throws WorkflowApprovalNotFoundError if approval not found
   * @throws ApprovalAlreadyDecidedError if approval already decided
   */
  async execute(input: RejectWorkflowInput): Promise<void> {
    try {
      // Validate comment required for rejection
      if (!input.comment || input.comment.trim().length === 0) {
        throw new InvalidInputException('Rejection comment is required')
      }

      // 1. Authorize user
      await this.authorizationService.requireApprovalPermission(
        input.userId,
        input.organizationId,
        input.projectId
      )

      // 2. Load run and verify state
      const run = await this.workflowRunRepository.findRunById(input.runId)
      if (!run) {
        throw new WorkflowRunNotFoundError(input.runId)
      }

      if (run.organizationId !== input.organizationId) {
        throw new UnauthorizedAccessError('Run does not belong to organization')
      }

      if (run.state !== WorkflowState.WAITING_APPROVAL) {
        throw new InvalidWorkflowStateError(
          `Expected waiting_approval, got ${run.state}`
        )
      }

      // 3. Load approval and verify state
      const approval = await this.workflowApprovalRepository.findByRunId(input.runId)
      if (!approval) {
        throw new WorkflowApprovalNotFoundError(input.runId)
      }

      if (!approvalEntity.isPending(approval)) {
        throw new ApprovalAlreadyDecidedError(approval.id)
      }

      // 4. Update approval with rejection
      const rejectedApproval = approvalEntity.reject(approval, input.userId, input.comment)
      await this.workflowApprovalRepository.save(rejectedApproval)

      // 5. Emit approval_decided event with rejection details
      await this.eventRepository.appendEvent({
        runId: input.runId,
        organizationId: input.organizationId,
        eventType: 'approval_decided',
        payload: {
          runId: input.runId,
          projectId: run.projectId,
          organizationId: input.organizationId,
          approvalId: approval.id,
          decision: 'rejected',
          decidedByUserId: input.userId,
          decidedAt: new Date().toISOString(),
          comment: input.comment,
          rejectionReason: input.comment,
        },
      })

      // 6. Transition run to cancelled state
      await this.workflowRunRepository.updateRunState(input.runId, {
        status: WorkflowState.CANCELLED,
        cancellationReason: input.comment,
        cancelledByUserId: input.userId,
        cancelledAt: new Date(),
      })

      // 7. Do not queue next step (workflow ends)

      this.logger.info('Workflow rejected', {
        runId: input.runId,
        approvalId: approval.id,
        rejectedBy: input.userId,
        reason: input.comment,
      })
    } catch (error) {
      this.logger.error('Workflow rejection failed', {
        runId: input.runId,
        userId: input.userId,
        error: error instanceof Error ? error.message : String(error),
      })

      throw error
    }
  }
}
