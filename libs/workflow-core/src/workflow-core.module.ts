import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { DatabaseModule } from '@vyrak/database'

import { eventRepositoryProvider, JOB_QUEUE, stepRepositoryProvider, WORKFLOW_REPOSITORY } from './infras/di/di'
import { BullMQJobQueue } from './infras/queue/bullmq-job-queue'
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
      useClass: WorkflowPrismaRepository,
    },
    stepRepositoryProvider,
    eventRepositoryProvider,
  ],
  exports: [JOB_QUEUE, WORKFLOW_REPOSITORY, stepRepositoryProvider, eventRepositoryProvider],
})
export class WorkflowCoreModule {}
