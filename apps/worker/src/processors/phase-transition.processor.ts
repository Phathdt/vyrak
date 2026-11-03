import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { EnhancedLogger } from '@vyrak/custom-logger'
import { DatabaseService } from '@vyrak/database'
import { EVENT_BUS, IEventBus, PhaseApprovedEventSchema } from '@vyrak/event-bus'
import {
  IWorkflowPhaseRepository,
  IWorkflowRepository,
  WORKFLOW_PHASE_REPOSITORY,
  WORKFLOW_REPOSITORY,
} from '@vyrak/workflow-core'
import {
  CODE_REVIEW_SERVICE,
  IMPLEMENTATION_ORCHESTRATION_SERVICE,
  QA_VERIFICATION_SERVICE,
} from '@vyrak/workflow-execution'

import { withTenantContext } from '../common/decorators/with-tenant-context.decorator'
import { WorkerProcessingError } from '../common/errors/worker-error'

import type { PhaseApprovedEvent } from '@vyrak/event-bus'
import type {
  ICodeReviewService,
  IImplementationOrchestrationService,
  IQAVerificationService,
} from '@vyrak/workflow-execution'

const PHASE_APPROVED = 'phase.approved' as const

@Injectable()
export class PhaseTransitionProcessor implements OnModuleInit {
  private readonly logger: EnhancedLogger

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly databaseService: DatabaseService,
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepository: IWorkflowRepository,
    @Inject(WORKFLOW_PHASE_REPOSITORY)
    private readonly workflowPhaseRepository: IWorkflowPhaseRepository,
    @Inject(IMPLEMENTATION_ORCHESTRATION_SERVICE)
    private readonly implementationOrchestrationService: IImplementationOrchestrationService,
    @Inject(CODE_REVIEW_SERVICE)
    private readonly codeReviewService: ICodeReviewService,
    @Inject(QA_VERIFICATION_SERVICE)
    private readonly qaService: IQAVerificationService,
    enhancedLogger: EnhancedLogger
  ) {
    this.logger = enhancedLogger.with({ context: 'PhaseTransitionWorker' })
  }

  async onModuleInit() {
    // Validate before the tenant wrapper reads metadata.orgId, so malformed events never set tenant context
    const handler = withTenantContext(this.databaseService, this.handlePhaseApproved.bind(this))

    await this.eventBus.subscribe<unknown>(PHASE_APPROVED, (rawEvent) => handler(this.parsePhaseApproved(rawEvent)), {
      group: 'phase-transition-workers',
      consumer: `phase-transition-worker-${process.pid}`,
      maxRetries: 3,
    })

    this.logger.log('Subscribed to phase.approved events')
  }

  private parsePhaseApproved(rawEvent: unknown): PhaseApprovedEvent {
    const parseResult = PhaseApprovedEventSchema.safeParse(rawEvent)
    if (!parseResult.success) {
      const message = `Invalid phase.approved event schema: ${parseResult.error.message}`
      this.logger.error(new Error(message), 'Event validation failed')
      throw new Error(message)
    }
    return parseResult.data
  }

  private async handlePhaseApproved(event: PhaseApprovedEvent): Promise<void> {
    const orgId = event.metadata?.orgId
    if (!orgId) {
      throw new Error('phase.approved event is missing metadata.orgId')
    }

    const projectId = event.metadata?.projectId
    if (!projectId) {
      throw new Error('phase.approved event is missing metadata.projectId')
    }

    const { workflowId, phaseId, phaseKey, nextPhaseKey } = event

    // Idempotency: the same event may be delivered more than once. Skip unless
    // the workflow is still at the expected transition and the phase is completed.
    const workflow = await this.workflowRepository.findById(workflowId)
    if (!workflow) {
      this.logger.warn(`Workflow not found: ${workflowId}, skipping event (idempotent)`)
      return
    }

    const completedPhase = await this.workflowPhaseRepository.findById(phaseId)
    if (!completedPhase || completedPhase.status !== 'COMPLETED') {
      this.logger.warn(
        `Phase ${phaseId} is not COMPLETED (status: ${completedPhase?.status || 'not found'}), skipping event (idempotent)`
      )
      return
    }

    if (workflow.currentPhaseKey !== nextPhaseKey) {
      this.logger.warn(
        `Workflow already advanced (current: ${workflow.currentPhaseKey}, expected: ${nextPhaseKey}), skipping event (idempotent)`
      )
      return
    }

    this.logger.log(
      `Phase approved: orgId=${orgId} projectId=${projectId} workflowId=${workflowId} phaseId=${phaseId} ${phaseKey} -> ${nextPhaseKey}`
    )

    try {
      switch (nextPhaseKey) {
        case 'implementation':
          await this.implementationOrchestrationService.startImplementation(workflowId, phaseId)
          break
        case 'code-review':
          await this.codeReviewService.startCodeReview(workflowId, phaseId)
          break
        case 'qa':
          await this.qaService.startQA(workflowId, phaseId)
          break
        default:
          this.logger.warn(
            `No automatic transition for nextPhaseKey=${nextPhaseKey}: orgId=${orgId} projectId=${projectId} workflowId=${workflowId} phaseId=${phaseId}`
          )
          return
      }

      this.logger.log(
        `Started next phase ${nextPhaseKey}: orgId=${orgId} projectId=${projectId} workflowId=${workflowId} phaseId=${phaseId}`
      )
    } catch (error) {
      const enrichedError = new WorkerProcessingError(
        `Failed to process phase.approved event: ${error instanceof Error ? error.message : String(error)}`,
        {
          processor: 'PhaseTransitionProcessor',
          eventType: PHASE_APPROVED,
          workflowId,
          phaseId,
          phaseKey,
          nextPhaseKey,
          orgId,
          projectId,
          originalError: error instanceof Error ? error : undefined,
        }
      )

      this.logger.error(
        enrichedError,
        `Phase transition failed: orgId=${orgId} projectId=${projectId} workflowId=${workflowId} phaseId=${phaseId} ${phaseKey} -> ${nextPhaseKey}`
      )
      // Rethrow enriched error so the event bus applies its retry policy and DLQ entry carries context
      throw enrichedError
    }
  }
}
