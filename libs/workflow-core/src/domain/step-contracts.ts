import { z } from 'zod'

import { InvalidStepConfigError } from './errors'
import { StepStatus, StepStatusSchema, StepType, StepTypeSchema } from './step-types'

/**
 * Retry policy for step execution
 */
export interface RetryPolicy {
  maxAttempts: number
  backoffMs: number
  retryableErrorCodes: string[]
  maxDurationMs?: number
}

/**
 * Timeout policy for step execution
 */
export interface TimeoutPolicy {
  stepTimeoutMs: number
  totalTimeoutMs?: number
}

/**
 * Input for step execution
 */
export interface StepExecutionInput {
  stepKey: string
  stepType: StepType
  input: unknown
  context?: Record<string, unknown>
}

/**
 * Result of step execution
 */
export interface StepExecutionResult {
  status: StepStatus
  output?: unknown
  errorCode?: string
  errorMessage?: string
  retryable: boolean
  durationMs?: number
}

/**
 * Step configuration
 */
export interface StepConfig {
  key: string
  type: StepType
  config: Record<string, unknown>
  retryPolicy?: RetryPolicy
  timeoutPolicy?: TimeoutPolicy
}

/**
 * Zod schemas for validation
 */

export const RetryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).max(100),
  backoffMs: z.number().int().min(0).max(3600000),
  retryableErrorCodes: z.array(z.string().min(1)),
  maxDurationMs: z.number().int().min(1000).optional(),
})

export const TimeoutPolicySchema = z.object({
  stepTimeoutMs: z.number().int().min(100).max(3600000),
  totalTimeoutMs: z.number().int().min(100).max(86400000).optional(),
})

export const StepConfigSchema = z.object({
  key: z.string().min(1).max(255),
  type: StepTypeSchema,
  config: z.record(z.unknown()),
  retryPolicy: RetryPolicySchema.optional(),
  timeoutPolicy: TimeoutPolicySchema.optional(),
})

export const StepExecutionInputSchema = z.object({
  stepKey: z.string().min(1),
  stepType: StepTypeSchema,
  input: z.unknown(),
  context: z.record(z.unknown()).optional(),
})

export const StepExecutionResultSchema = z.object({
  status: StepStatusSchema,
  output: z.unknown().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  retryable: z.boolean(),
  durationMs: z.number().int().min(0).optional(),
})

/**
 * Domain errors
 */

export class StepExecutionError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string,
    public readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'StepExecutionError'
  }
}

/**
 * Validate that step configuration is valid
 * @throws InvalidStepConfigError
 */
export function validateStepConfig(config: unknown): StepConfig {
  try {
    return StepConfigSchema.parse(config)
  } catch (error) {
    throw new InvalidStepConfigError(
      `Invalid step configuration: ${error instanceof Error ? error.message : 'unknown error'}`
    )
  }
}

/**
 * Check if a step should be retried
 */
export function shouldRetryStep(result: StepExecutionResult, policy: RetryPolicy, currentAttempt: number): boolean {
  if (currentAttempt >= policy.maxAttempts) return false
  if (!result.retryable) return false
  if (!result.errorCode) return false
  return policy.retryableErrorCodes.includes(result.errorCode)
}

/**
 * Calculate backoff delay for retry
 */
export function calculateBackoffDelay(
  attempt: number,
  baseBackoffMs: number,
  strategy: 'linear' | 'exponential' = 'exponential'
): number {
  if (strategy === 'linear') {
    return baseBackoffMs * attempt
  }
  // exponential: 100ms, 200ms, 400ms, 800ms, ...
  return baseBackoffMs * Math.pow(2, attempt - 1)
}
