import { DatabaseService } from '@vyrak/database'

import { WorkflowEventEntity, WorkflowEventEntitySchema } from '../../domain/entities/workflow-event.entity'
import { WorkflowRepositoryError } from '../../domain/errors/common.error'
import { CreateEventParams, IEventRepository } from '../../domain/interfaces/event.repository.interface'

export class EventPrismaRepository implements IEventRepository {
  constructor(private readonly db: DatabaseService) {}

  async appendEvent(event: CreateEventParams): Promise<WorkflowEventEntity> {
    try {
      // Atomic transaction ensures sequence integrity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma TransactionClient type
      const result = await this.db.client.$transaction(async (tx: any) => {
        // Get next sequence for this run
        const lastEvent = await tx.workflowEvent.findFirst({
          where: { runId: event.runId },
          orderBy: { sequence: 'desc' },
          select: { sequence: true },
        })
        const nextSequence = (lastEvent?.sequence ?? 0) + 1

        // Create event with assigned sequence
        return await tx.workflowEvent.create({
          data: {
            runId: event.runId,
            organizationId: event.organizationId,
            stepRunId: event.stepRunId ?? null,
            sequence: nextSequence,
            eventType: event.eventType,
            payload: event.payload,
          },
        })
      })

      return this.mapToDomain(result)
    } catch (error: unknown) {
      throw new WorkflowRepositoryError(
        'Failed to append workflow event',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async findEventsByRunId(runId: string, limit: number = 100, offset: number = 0): Promise<WorkflowEventEntity[]> {
    try {
      const events = await this.db.client.workflowEvent.findMany({
        where: { runId },
        orderBy: { sequence: 'asc' },
        take: limit,
        skip: offset,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma internal type
      return events.map((event: any) => this.mapToDomain(event))
    } catch (error: unknown) {
      throw new WorkflowRepositoryError(
        'Failed to find workflow events',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async getNextSequence(runId: string): Promise<number> {
    try {
      const lastEvent = await this.db.client.workflowEvent.findFirst({
        where: { runId },
        orderBy: { sequence: 'desc' },
        select: { sequence: true },
      })
      return (lastEvent?.sequence ?? 0) + 1
    } catch (error: unknown) {
      throw new WorkflowRepositoryError(
        'Failed to get next sequence',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma internal type
  private mapToDomain(prismaEvent: any): WorkflowEventEntity {
    const validated = WorkflowEventEntitySchema.parse({
      id: prismaEvent.id,
      runId: prismaEvent.runId,
      organizationId: prismaEvent.organizationId,
      stepRunId: prismaEvent.stepRunId,
      sequence: prismaEvent.sequence,
      eventType: prismaEvent.eventType,
      payload: prismaEvent.payload as Record<string, unknown>,
      createdAt: prismaEvent.createdAt,
    })
    return validated
  }
}
