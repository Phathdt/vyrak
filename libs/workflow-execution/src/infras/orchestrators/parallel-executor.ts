import type { TaskExecutionResult } from '../../domain/interfaces/orchestration-engine.interface'

export interface ParallelExecutionOptions {
  maxConcurrency?: number
  onTaskStart?: (taskId: string) => void
  onTaskComplete?: (result: TaskExecutionResult) => void
  onTaskError?: (taskId: string, error: Error) => void
}

export interface ParallelExecutionResult {
  completed: TaskExecutionResult[]
  failed: TaskExecutionResult[]
  duration: number
}

/**
 * Parallel execution engine for running independent tasks concurrently
 * Uses Promise.allSettled to handle failures gracefully
 */
export class ParallelExecutor {
  private readonly maxConcurrency: number

  constructor(maxConcurrency: number = 3) {
    this.maxConcurrency = maxConcurrency
  }

  /**
   * Execute tasks in parallel with concurrency limit
   * @param taskIds Array of task IDs to execute
   * @param executeTask Function that executes a single task
   * @param options Execution options for callbacks
   */
  async execute(
    taskIds: string[],
    executeTask: (taskId: string) => Promise<TaskExecutionResult>,
    options?: ParallelExecutionOptions
  ): Promise<ParallelExecutionResult> {
    const startTime = Date.now()
    const maxConcurrency = options?.maxConcurrency ?? this.maxConcurrency
    const results: TaskExecutionResult[] = []
    const errors: TaskExecutionResult[] = []

    // Execute tasks in batches to respect concurrency limit
    for (let i = 0; i < taskIds.length; i += maxConcurrency) {
      const batch = taskIds.slice(i, i + maxConcurrency)

      const batchPromises = batch.map(async (taskId) => {
        try {
          options?.onTaskStart?.(taskId)
          const result = await executeTask(taskId)
          options?.onTaskComplete?.(result)
          return result
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          options?.onTaskError?.(taskId, err)

          // Return failed result
          const failedResult: TaskExecutionResult = {
            taskId,
            status: 'failed',
            error: err.message,
            startedAt: new Date(),
            completedAt: new Date(),
          }
          return failedResult
        }
      })

      // Wait for batch to complete
      const batchResults = await Promise.allSettled(batchPromises)

      // Collect results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const taskResult = result.value
          if (taskResult.status === 'completed') {
            results.push(taskResult)
          } else {
            errors.push(taskResult)
          }
        } else {
          // Promise rejection (should not happen due to try-catch, but handle it)
          errors.push({
            taskId: 'unknown',
            status: 'failed',
            error: result.reason?.message || 'Unknown error',
            startedAt: new Date(),
            completedAt: new Date(),
          })
        }
      }
    }

    const duration = Date.now() - startTime

    return {
      completed: results,
      failed: errors,
      duration,
    }
  }

  /**
   * Execute tasks with dependency awareness
   * Independent tasks run in parallel, dependent tasks wait for dependencies
   */
  async executeWithDependencies(
    allTaskIds: string[],
    getDependencies: (taskId: string) => Promise<string[]>,
    executeTask: (taskId: string) => Promise<TaskExecutionResult>,
    options?: ParallelExecutionOptions
  ): Promise<ParallelExecutionResult> {
    const startTime = Date.now()
    const completed = new Set<string>()
    const failed = new Set<string>()
    const results: TaskExecutionResult[] = []
    const errors: TaskExecutionResult[] = []

    while (completed.size + failed.size < allTaskIds.length) {
      // Find tasks ready to execute
      const readyTasks: string[] = []
      for (const taskId of allTaskIds) {
        if (completed.has(taskId) || failed.has(taskId)) {
          continue
        }

        const deps = await getDependencies(taskId)
        const allDepsCompleted = deps.every((dep) => completed.has(dep))

        if (allDepsCompleted) {
          readyTasks.push(taskId)
        }
      }

      if (readyTasks.length === 0) {
        // No ready tasks and not all tasks done = blocked by failures
        break
      }

      // Execute ready tasks in parallel
      const batchResult = await this.execute(readyTasks, executeTask, options)

      // Update completed/failed sets
      for (const result of batchResult.completed) {
        completed.add(result.taskId)
        results.push(result)
      }

      for (const result of batchResult.failed) {
        failed.add(result.taskId)
        errors.push(result)
      }
    }

    const duration = Date.now() - startTime

    return {
      completed: results,
      failed: errors,
      duration,
    }
  }
}
