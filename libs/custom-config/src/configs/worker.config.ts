import { z } from 'zod'

/**
 * Worker runtime settings.
 *
 * Environment overrides (applied only because the YAML defines every key):
 * - WORKER__CHAT_CONCURRENCY → chatConcurrency
 * - WORKER__EXECUTION_CONCURRENCY → executionConcurrency
 */
export const WorkerConfigSchema = z.object({
  /** Number of chat turns a single worker process streams in parallel. */
  chatConcurrency: z.number().int().min(1).default(5),
  /** Number of workflow phase runs (implementation, review, QA) one worker process runs in parallel. */
  executionConcurrency: z.number().int().min(1).default(1),
})

export type WorkerConfig = z.infer<typeof WorkerConfigSchema>
