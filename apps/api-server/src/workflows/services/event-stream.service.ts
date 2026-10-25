import { Inject, Injectable, Logger } from '@nestjs/common'
import { EVENT_REPOSITORY, type IEventRepository } from '@vyrak/workflow-core'
import { defer, interval, Observable } from 'rxjs'
import { map, share, switchMap, takeWhile } from 'rxjs/operators'

interface StreamState {
  lastSequence: number
  isTerminal: boolean
}

@Injectable()
export class EventStreamService {
  private readonly logger = new Logger(EventStreamService.name)

  // Polling interval in milliseconds
  private readonly POLL_INTERVAL = 2000

  // Terminal event types that close the stream
  private readonly TERMINAL_EVENT_TYPES = ['workflow_completed', 'workflow_failed', 'workflow_cancelled']

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepo: IEventRepository
  ) {}

  /**
   * Create observable stream of workflow events
   * Polls database every 2s for new events
   * Closes when workflow reaches terminal state
   */
  createEventStream(runId: string, initialSequence = 0): Observable<MessageEvent> {
    const state: StreamState = {
      lastSequence: initialSequence,
      isTerminal: false,
    }

    return defer(() => {
      this.logger.log(`Starting event stream for run ${runId}`)

      return interval(this.POLL_INTERVAL).pipe(
        // Fetch new events since last sequence
        switchMap(async () => {
          if (state.isTerminal) {
            return []
          }

          try {
            const events = await this.eventRepo.findByRunIdSince(runId, state.lastSequence)
            return events
          } catch (error) {
            this.logger.error(`Error fetching events for ${runId}:`, error)
            return []
          }
        }),

        // Flatten array of events
        switchMap((events) => events),

        // Update state and check for terminal events
        map((event) => {
          state.lastSequence = Math.max(state.lastSequence, event.sequence)

          // Check if this is a terminal state event
          if (this.TERMINAL_EVENT_TYPES.includes(event.eventType)) {
            state.isTerminal = true
          }

          return event
        }),

        // Continue until terminal state
        takeWhile(() => !state.isTerminal, true),

        // Convert to SSE MessageEvent format
        map((event) => {
          const messageEvent: MessageEvent = {
            data: JSON.stringify({
              eventType: event.eventType,
              runId: event.runId,
              sequence: event.sequence,
              payload: event.payload,
              timestamp: event.createdAt.toISOString(),
            }),
          } as MessageEvent

          return messageEvent
        }),

        // Share subscription among multiple observers
        share()
      )
    })
  }
}
