import { WorkflowEventEntity } from '../entities/workflow-event.entity'

/**
 * Repository interface for event operations
 */
export interface IEventRepository {
  /**
   * Append a new event with atomic sequence generation
   */
  appendEvent(event: CreateEventParams): Promise<WorkflowEventEntity>

  /**
   * Find events for a workflow run with pagination
   */
  findEventsByRunId(runId: string, limit?: number, offset?: number): Promise<WorkflowEventEntity[]>

  /**
   * Get next sequence number for a run (for manual use)
   */
  getNextSequence(runId: string): Promise<number>
}

/**
 * Parameters for creating a new event
 */
export interface CreateEventParams {
  runId: string
  organizationId: string
  stepRunId?: string
  eventType: string
  payload: Record<string, unknown>
}
