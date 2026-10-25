import { Inject } from '@nestjs/common'

import type { WorkflowRun } from '../../domain/entities'
import type { IEventRepository, IWorkflowRepository } from '../../domain/interfaces'
import { EVENT_REPOSITORY, WORKFLOW_REPOSITORY } from '../../infras/di'
import type { StartWorkflowInput } from '../dtos/start-workflow.dto'

/**
 * Use case for starting a new workflow run
 *
 * Responsibilities:
 * - Validate organization/project access (TODO: Add authorization service)
 * - Check idempotency to prevent duplicate runs
 * - Create workflow run with QUEUED state
 * - Emit run_created event
 * - Enqueue job for execution (TODO: Add in Story 2.2)
 */
export class StartWorkflowUseCase {
  constructor(
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: IWorkflowRepository,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepo: IEventRepository
    // TODO: Add IJobQueue in Story 2.2
    // @Inject(JOB_QUEUE)
    // private readonly jobQueue: IJobQueue,
    // TODO: Add IAuthorizationService when available
    // @Inject(AUTHORIZATION_SERVICE)
    // private readonly authService: IAuthorizationService,
  ) {}

  /**
   * Execute the start workflow use case
   *
   * @param input - Parameters for starting the workflow
   * @returns The created or existing workflow run
   * @throws WorkflowAlreadyExistsError if idempotency key collision occurs
   */
  async execute(input: StartWorkflowInput): Promise<WorkflowRun> {
    // TODO: Step 1 - Verify authorization when auth service is available
    // await this.authService.verifyProjectAccess(
    //   input.initiatedByUserId,
    //   input.organizationId,
    //   input.projectId
    // )

    // Step 2 - Check idempotency key for duplicate submissions
    if (input.idempotencyKey) {
      const existingRun = await this.workflowRepo.findRunByIdempotencyKey(input.organizationId, input.idempotencyKey)

      if (existingRun) {
        // Return existing run without creating duplicate
        return existingRun
      }
    }

    // Step 3 - Create workflow run with QUEUED state
    const run = await this.workflowRepo.createRun({
      organizationId: input.organizationId,
      projectId: input.projectId,
      workflowKey: input.workflowKey,
      workflowVersion: input.workflowVersion,
      initiatedByUserId: input.initiatedByUserId,
      idempotencyKey: input.idempotencyKey,
      input: input.input,
    })

    // Step 4 - Emit run_created event
    await this.eventRepo.appendEvent({
      runId: run.id,
      organizationId: input.organizationId,
      eventType: 'run_created',
      payload: {
        workflowKey: input.workflowKey,
        workflowVersion: input.workflowVersion,
        initiatedByUserId: input.initiatedByUserId,
        projectId: input.projectId,
      },
    })

    // TODO: Step 5 - Dispatch job to queue (Story 2.2)
    // await this.jobQueue.enqueueWorkflowJob(run.id, input.organizationId)

    return run
  }
}
