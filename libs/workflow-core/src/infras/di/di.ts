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
 * Provider factory for step repository
 */
export function createStepRepositoryProvider(): { provide: typeof STEP_REPOSITORY; useClass: typeof StepPrismaRepository } {
  return {
    provide: STEP_REPOSITORY,
    useClass: StepPrismaRepository,
  }
}

/**
 * Provider factory for event repository
 */
export function createEventRepositoryProvider(): { provide: typeof EVENT_REPOSITORY; useClass: typeof EventPrismaRepository } {
  return {
    provide: EVENT_REPOSITORY,
    useClass: EventPrismaRepository,
  }
}

/**
 * Legacy exports for backward compatibility with NestJS modules
 */
export const stepRepositoryProvider = createStepRepositoryProvider()
export const eventRepositoryProvider = createEventRepositoryProvider()
