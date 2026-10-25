import { z } from 'zod'

/**
 * Classification of step execution errors
 */
export type ErrorClassification = 'retryable' | 'non_retryable' | 'timeout'

/**
 * Zod schema for error classification
 */
export const ErrorClassificationSchema = z.enum(['retryable', 'non_retryable', 'timeout'])

/**
 * Classify execution error to determine retry behavior
 */
export function classifyError(
  errorCode: string,
  retryableErrorCodes: string[],
  isTimeout: boolean = false
): ErrorClassification {
  if (isTimeout) return 'timeout'
  if (retryableErrorCodes.includes(errorCode)) return 'retryable'
  return 'non_retryable'
}
