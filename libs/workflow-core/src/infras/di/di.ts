import type { Provider } from '@nestjs/common'

import type { IEventRepository } from '../../domain/interfaces/event.repository.interface'
import type { IStepRepository } from '../../domain/interfaces/step-repository.interface'
import { EventPrismaRepository } from '../repositories/event-prisma.repository'
import { StepPrismaRepository } from '../repositories/step-prisma.repository'

/**
 * Dependency injection tokens for workflow-core infrastructure
 * Uses Symbol for type-safe injection without circular dependencies
 */

/**
 * Job queue service for enqueuing workflow execution jobs
 */
export const JOB_QUEUE = Symbol('JOB_QUEUE')

/**
 * Workflow repository for persistence operations
 */
export const WORKFLOW_REPOSITORY = Symbol('WORKFLOW_REPOSITORY')

/**
 * Step repository for step run persistence
 */
export const STEP_REPOSITORY = Symbol('STEP_REPOSITORY')

/**
 * Event repository for workflow event storage
 */
export const EVENT_REPOSITORY = Symbol('EVENT_REPOSITORY')

/**
 * Provider for step repository
 */
export const stepRepositoryProvider: Provider<IStepRepository> = {
  provide: STEP_REPOSITORY,
  useClass: StepPrismaRepository,
}

/**
 * Provider for event repository
 */
export const eventRepositoryProvider: Provider<IEventRepository> = {
  provide: EVENT_REPOSITORY,
  useClass: EventPrismaRepository,
}
