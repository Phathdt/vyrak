import { createHash } from 'crypto'
import { Logger } from '@nestjs/common'

import type { IWorkflowApprovalRepository, IEventRepository } from '../../domain/interfaces'
import { WorkflowApprovalNotFoundError, ArtifactNotFoundError } from '../../domain/errors'
import type { IArtifact, IArtifactRepository } from '../../domain/interfaces/artifact.interface'
import { invalidate as invalidateApprovalFn, isPending } from '../../domain/entities/workflow-approval.entity'

/**
 * Approval Validator Service
 *
 * Plain TypeScript class (no @Injectable) following hexagonal architecture.
 * Validates plan versions to prevent stale approvals from applying to regenerated plans.
 *
 * @see Phase 2: Plan Version Validation (Story 4.4)
 */
export class ApprovalValidatorService {
  private readonly logger = new Logger(ApprovalValidatorService.name)

  constructor(
    private readonly workflowApprovalRepository: IWorkflowApprovalRepository,
    private readonly artifactRepository: IArtifactRepository,
    private readonly eventRepository: IEventRepository
  ) {}

  /**
   * Validate if approval is still valid for current artifact
   *
   * @param approvalId - Approval to validate
   * @param currentArtifactId - Current plan artifact ID
   * @returns true if approval valid and artifact matches, false otherwise
   * @throws WorkflowApprovalNotFoundError if approval not found
   * @throws ArtifactNotFoundError if artifact not found
   */
  async validatePlanVersion(approvalId: string, currentArtifactId: string): Promise<boolean> {
    try {
      const approval = await this.workflowApprovalRepository.findById(approvalId)
      if (!approval) {
        throw new WorkflowApprovalNotFoundError(approvalId)
      }

      // 1. Check if approval is invalidated
      if (approval.invalidatedAt) {
        this.logger.log(
          `Approval is invalidated: ${approvalId}, invalidatedAt=${approval.invalidatedAt}, reason=${approval.invalidationReason}`
        )
        return false
      }

      // 2. Check if artifact ID matches
      if (approval.planArtifactId !== currentArtifactId) {
        this.logger.warn(
          `Artifact ID mismatch: approvalId=${approvalId}, expected=${approval.planArtifactId}, current=${currentArtifactId}`
        )
        return false
      }

      // 3. Verify artifact content hasn't changed
      const currentArtifact = await this.artifactRepository.findById(currentArtifactId)
      if (!currentArtifact) {
        throw new ArtifactNotFoundError(currentArtifactId)
      }

      const currentHash = this.hashArtifact(currentArtifact)
      if (approval.planArtifactHash !== currentHash) {
        this.logger.warn(
          `Artifact content changed: approvalId=${approvalId}, expected=${approval.planArtifactHash}, current=${currentHash}`
        )
        return false
      }

      return true
    } catch (error) {
      this.logger.error(
        `Plan version validation failed: approvalId=${approvalId}, currentArtifactId=${currentArtifactId}, error=${error instanceof Error ? error.message : String(error)}`
      )
      throw error
    }
  }

  /**
   * Invalidate approval when plan is regenerated
   *
   * @param approvalId - Approval to invalidate
   * @param reason - Reason for invalidation
   * @throws WorkflowApprovalNotFoundError if approval not found
   */
  async invalidateApproval(approvalId: string, reason: string): Promise<void> {
    try {
      const approval = await this.workflowApprovalRepository.findById(approvalId)
      if (!approval) {
        throw new WorkflowApprovalNotFoundError(approvalId)
      }

      if (approval.invalidatedAt) {
        this.logger.log(`Approval already invalidated: ${approvalId}`)
        return
      }

      // 1. Mark approval as invalidated
      const invalidatedApproval = invalidateApprovalFn(approval, reason)
      await this.workflowApprovalRepository.save(invalidatedApproval)

      // 2. Emit invalidation event
      await this.eventRepository.appendEvent({
        runId: approval.workflowRunId,
        organizationId: '', // Will be populated from run context
        eventType: 'approval_invalidated',
        payload: {
          approvalId: approval.id,
          runId: approval.workflowRunId,
          invalidatedAt: new Date().toISOString(),
          reason,
          previousArtifactId: approval.planArtifactId,
        },
      })

      this.logger.log(`Approval invalidated: ${approvalId}, reason=${reason}`)
    } catch (error) {
      this.logger.error(
        `Approval invalidation failed: approvalId=${approvalId}, reason=${reason}, error=${error instanceof Error ? error.message : String(error)}`
      )
      throw error
    }
  }

  /**
   * Handle plan regeneration during approval workflow
   *
   * @param runId - Workflow run ID
   * @param newArtifactId - New plan artifact ID
   */
  async handlePlanRegeneration(runId: string, newArtifactId: string): Promise<void> {
    try {
      // 1. Load current approval
      const approval = await this.workflowApprovalRepository.findByRunId(runId)
      if (!approval) {
        this.logger.log(`No approval found for run, skip invalidation: ${runId}`)
        return
      }

      // 2. Check if approval is already pending (not decided)
      if (!isPending(approval)) {
        this.logger.log(`Approval already decided, skip invalidation: runId=${runId}, status=${approval.status}`)
        return
      }

      // 3. Invalidate pending approval
      await this.invalidateApproval(approval.id, `Plan regenerated with new artifact: ${newArtifactId}`)

      this.logger.log(
        `Plan regeneration handled, approval invalidated: runId=${runId}, oldArtifactId=${approval.planArtifactId}, newArtifactId=${newArtifactId}`
      )
    } catch (error) {
      this.logger.error(
        `Plan regeneration handling failed: runId=${runId}, newArtifactId=${newArtifactId}, error=${error instanceof Error ? error.message : String(error)}`
      )
      throw error
    }
  }

  /**
   * Hash artifact content using SHA-256
   * Handles both string and object content types
   *
   * @param artifact - Artifact to hash
   * @returns Hex-encoded SHA-256 hash
   */
  private hashArtifact(artifact: IArtifact): string {
    const content = typeof artifact.content === 'string' ? artifact.content : JSON.stringify(artifact.content)
    return createHash('sha256').update(content).digest('hex')
  }
}
