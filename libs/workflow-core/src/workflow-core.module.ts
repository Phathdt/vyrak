import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { EVENT_REPOSITORY, JOB_QUEUE, STEP_REPOSITORY, WORKFLOW_REPOSITORY } from './infras/di/di'
import { BullMQJobQueue } from './infras/queue/bullmq-job-queue'
import { EventPrismaRepository } from './infras/repositories/event-prisma.repository'
import { StepPrismaRepository } from './infras/repositories/step-prisma.repository'
import { WorkflowPrismaRepository } from './infras/repositories/workflow-prisma.repository'

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
