import { DatabaseService, Prisma } from '@vyrak/database'

import {
  CreateEventParams,
  IEventRepository,
  WorkflowEventEntity,
  WorkflowEventEntitySchema,
  WorkflowRepositoryError,
} from '../../domain'

export class EventPrismaRepository implements IEventRepository {
  constructor(private readonly db: DatabaseService) {}

  async appendEvent(event: CreateEventParams): Promise<WorkflowEventEntity> {
    try {
      // Use advisory lock + transaction for atomic sequence generation
      // Lock must be held across both SELECT and INSERT to prevent race conditions
      const lockId = this.getLockId(event.runId)

      // Acquire advisory lock (needs raw SQL)
      await this.db.rawClient.$executeRaw`SELECT pg_advisory_lock(${lockId})`

      try {
        // Use raw client for transaction that needs full Prisma API
        const result = await this.db.rawClient.$transaction(async (tx) => {
          // Get next sequence
          const sequenceResult = (await tx.$queryRaw`
            SELECT COALESCE(MAX(sequence), 0) + 1 as sequence
            FROM workflow_events
            WHERE run_id = ${event.runId}
          `) as Array<{ sequence: number }>

          const nextSequence = sequenceResult[0]?.sequence ?? 1

          // Create event with assigned sequence
          return await tx.workflowEvent.create({
            data: {
              runId: event.runId,
              organizationId: event.organizationId,
              stepRunId: event.stepRunId ?? null,
              sequence: nextSequence,
              eventType: event.eventType,
              payload: event.payload as Prisma.InputJsonValue,
            },
          })
        })

        return this.mapToDomain(result)
      } finally {
        // Always release lock
        await this.db.rawClient.$executeRaw`SELECT pg_advisory_unlock(${lockId})`
      }
    } catch (error: unknown) {
      throw new WorkflowRepositoryError(
        'Failed to append workflow event',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  private getLockId(runId: string): number {
    // Convert runId to a stable 32-bit integer for pg_advisory_lock
    // Use MD5 hash and take first 8 hex chars
    const crypto = require('crypto')
    const hash = crypto.createHash('md5').update(runId).digest('hex')
    const hexValue = hash.substring(0, 8)
    // Convert to signed 32-bit integer
    return parseInt(hexValue, 16) | 0
  }

  async findEventsByRunId(runId: string, limit: number = 100, offset: number = 0): Promise<WorkflowEventEntity[]> {
    try {
      const events = await this.db.rawClient.workflowEvent.findMany({
        where: { runId },
        orderBy: { sequence: 'asc' },
        take: limit,
        skip: offset,
      })
      return events.map((event) => this.mapToDomain(event))
    } catch (error: unknown) {
      throw new WorkflowRepositoryError(
        'Failed to find workflow events',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async getNextSequence(runId: string): Promise<number> {
    try {
      // Use $queryRaw for better read-after-write consistency
      const result = (await this.db.rawClient.$queryRaw`
        SELECT COALESCE(MAX(sequence), 0) + 1 as sequence
        FROM workflow_events
        WHERE run_id = ${runId}
      `) as Array<{ sequence: number | bigint }>

      const sequence = result[0]?.sequence
      // PostgreSQL returns bigint for aggregate functions, convert to number
      return typeof sequence === 'bigint' ? Number(sequence) : (sequence ?? 1)
    } catch (error: unknown) {
      throw new WorkflowRepositoryError(
        'Failed to get next sequence',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async countByRunId(runId: string): Promise<number> {
    try {
      return await this.db.client.workflowEvent.count({
        where: { runId },
      })
    } catch (error: unknown) {
      throw new WorkflowRepositoryError(
        'Failed to count workflow events',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  async findByRunIdSince(runId: string, sinceSequence: number): Promise<WorkflowEventEntity[]> {
    try {
      const events = await this.db.client.workflowEvent.findMany({
        where: {
          runId,
          sequence: {
            gt: sinceSequence,
          },
        },
        orderBy: {
          sequence: 'asc',
        },
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Prisma internal type
      return events.map((event: any) => this.mapToDomain(event))
    } catch (error: unknown) {
      throw new WorkflowRepositoryError(
        'Failed to find workflow events since sequence',
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
