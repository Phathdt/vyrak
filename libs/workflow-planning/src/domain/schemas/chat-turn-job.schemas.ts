import { z } from 'zod'

/** BullMQ queue that carries one job per chat turn. */
export const CHAT_TURN_QUEUE = 'chat-turn'

/** Job name used when enqueueing a chat turn. */
export const CHAT_TURN_JOB_NAME = 'chat-turn'

/** A job that waited longer than this in the queue is rejected instead of streamed. */
export const CHAT_TURN_MAX_WAIT_MS = 120_000

/**
 * Payload of a `chat-turn` job. `socketId` identifies the only socket that
 * receives the streamed events; `enqueuedAt` is a Unix timestamp in milliseconds.
 */
export const ChatTurnJobSchema = z.object({
  socketId: z.string().min(1),
  workflowId: z.string().min(1),
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  orgId: z.string().min(1),
  projectId: z.string().min(1),
  phase: z.string().min(1),
  message: z.string().min(1),
  enqueuedAt: z.number().int().positive(),
})

export type ChatTurnJob = z.infer<typeof ChatTurnJobSchema>
