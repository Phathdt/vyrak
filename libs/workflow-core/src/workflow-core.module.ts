import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { FakeStepExecutor } from './application/services/fake-step-executor'
import { LeaseManager } from './application/services/lease-manager.service'
import { RetryHandler } from './application/services/retry-handler.service'
import { WorkflowExecutorService } from './application/services/workflow-executor.service'
import { StartWorkflowUseCase } from './application/use-cases/start-workflow.use-case'
import {
  BullMQJobQueue,
  EVENT_REPOSITORY,
  EventPrismaRepository,
  JOB_QUEUE,
  STEP_REPOSITORY,
  StepPrismaRepository,
  WORKFLOW_REPOSITORY,
  WorkflowPrismaRepository,
} from './infras'

/**
 * Workflow Core Module
 * Provides workflow execution domain logic and infrastructure
 */
@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'workflow-execution',
    }),
  ],
  providers: [
    {
      provide: JOB_QUEUE,
      useClass: BullMQJobQueue,
    },
    {
      provide: WORKFLOW_REPOSITORY,
      useFactory: (db: DatabaseService) => new WorkflowPrismaRepository(db.client),
      inject: [DatabaseService],
    },
    {
      provide: STEP_REPOSITORY,
      useFactory: (db: DatabaseService) => new StepPrismaRepository(db.client),
      inject: [DatabaseService],
    },
    {
      provide: EVENT_REPOSITORY,
      useFactory: (db: DatabaseService) => new EventPrismaRepository(db.client),
      inject: [DatabaseService],
    },
    // Step executors
    FakeStepExecutor,
    {
      provide: 'STEP_EXECUTORS',
      useFactory: (fakeExecutor: FakeStepExecutor) => [fakeExecutor],
      inject: [FakeStepExecutor],
    },
    // Services
    LeaseManager,
    RetryHandler,
    WorkflowExecutorService,
    // Use cases
    StartWorkflowUseCase,
  ],
  exports: [
    JOB_QUEUE,
    WORKFLOW_REPOSITORY,
    STEP_REPOSITORY,
    EVENT_REPOSITORY,
    LeaseManager,
    RetryHandler,
    WorkflowExecutorService,
    StartWorkflowUseCase,
  ],
})
export class WorkflowCoreModule {}
