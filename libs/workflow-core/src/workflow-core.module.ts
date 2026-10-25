import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

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
      useFactory: (db: DatabaseService) => new WorkflowPrismaRepository(db),
      inject: [DatabaseService],
    },
    {
      provide: STEP_REPOSITORY,
      useFactory: (db: DatabaseService) => new StepPrismaRepository(db),
      inject: [DatabaseService],
    },
    {
      provide: EVENT_REPOSITORY,
      useFactory: (db: DatabaseService) => new EventPrismaRepository(db),
      inject: [DatabaseService],
    },
  ],
  exports: [JOB_QUEUE, WORKFLOW_REPOSITORY, STEP_REPOSITORY, EVENT_REPOSITORY],
})
export class WorkflowCoreModule {}
