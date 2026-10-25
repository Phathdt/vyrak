import { describe, expect, it } from 'vitest'

import {
  InvalidStepConfigError,
  RetryPolicySchema,
  StepConfigSchema,
  StepExecutionError,
  StepExecutionResultSchema,
  StepStatus,
  StepType,
  TimeoutPolicySchema,
  calculateBackoffDelay,
  classifyError,
  shouldRetryStep,
  validateStepConfig,
} from '../domain'

describe('Step Contracts', () => {
  describe('StepConfigSchema', () => {
    it('validates minimal config', () => {
      const config = {
        key: 'step-1',
        type: StepType.AGENT,
        config: {},
      }
      const result = StepConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('validates config with retry policy', () => {
      const config = {
        key: 'step-1',
        type: StepType.TOOL,
        config: { param: 'value' },
        retryPolicy: {
          maxAttempts: 3,
          backoffMs: 100,
          retryableErrorCodes: ['TIMEOUT', 'RATE_LIMIT'],
        },
      }
      const result = StepConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('validates config with timeout policy', () => {
      const config = {
        key: 'step-1',
        type: StepType.APPROVAL,
        config: {},
        timeoutPolicy: {
          stepTimeoutMs: 5000,
          totalTimeoutMs: 30000,
        },
      }
      const result = StepConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('validates config with both policies', () => {
      const config = {
        key: 'step-1',
        type: StepType.AGENT,
        config: { model: 'gpt-4' },
        retryPolicy: {
          maxAttempts: 5,
          backoffMs: 200,
          retryableErrorCodes: ['TIMEOUT'],
          maxDurationMs: 10000,
        },
        timeoutPolicy: {
          stepTimeoutMs: 2000,
        },
      }
      const result = StepConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('rejects invalid step type', () => {
      const config = {
        key: 'step-1',
        type: 'invalid-type',
        config: {},
      }
      const result = StepConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects empty key', () => {
      const config = {
        key: '',
        type: StepType.TOOL,
        config: {},
      }
      const result = StepConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects key longer than 255 characters', () => {
      const config = {
        key: 'a'.repeat(256),
        type: StepType.TOOL,
        config: {},
      }
      const result = StepConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    it('rejects missing config object', () => {
      const config = {
        key: 'step-1',
        type: StepType.AGENT,
      }
      const result = StepConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })
  })

  describe('RetryPolicySchema', () => {
    it('validates valid retry policy', () => {
      const policy = {
        maxAttempts: 3,
        backoffMs: 100,
        retryableErrorCodes: ['TIMEOUT', 'RATE_LIMIT'],
      }
      const result = RetryPolicySchema.safeParse(policy)
      expect(result.success).toBe(true)
    })

    it('validates retry policy with maxDurationMs', () => {
      const policy = {
        maxAttempts: 5,
        backoffMs: 500,
        retryableErrorCodes: ['TIMEOUT'],
        maxDurationMs: 30000,
      }
      const result = RetryPolicySchema.safeParse(policy)
      expect(result.success).toBe(true)
    })

    it('rejects maxAttempts less than 1', () => {
      const policy = {
        maxAttempts: 0,
        backoffMs: 100,
        retryableErrorCodes: ['TIMEOUT'],
      }
      const result = RetryPolicySchema.safeParse(policy)
      expect(result.success).toBe(false)
    })

    it('rejects maxAttempts greater than 100', () => {
      const policy = {
        maxAttempts: 101,
        backoffMs: 100,
        retryableErrorCodes: [],
      }
      const result = RetryPolicySchema.safeParse(policy)
      expect(result.success).toBe(false)
    })

    it('rejects negative backoffMs', () => {
      const policy = {
        maxAttempts: 3,
        backoffMs: -1,
        retryableErrorCodes: ['TIMEOUT'],
      }
      const result = RetryPolicySchema.safeParse(policy)
      expect(result.success).toBe(false)
    })

    it('rejects backoffMs greater than 1 hour', () => {
      const policy = {
        maxAttempts: 3,
        backoffMs: 3600001,
        retryableErrorCodes: ['TIMEOUT'],
      }
      const result = RetryPolicySchema.safeParse(policy)
      expect(result.success).toBe(false)
    })

    it('rejects empty error code in retryableErrorCodes', () => {
      const policy = {
        maxAttempts: 3,
        backoffMs: 100,
        retryableErrorCodes: ['TIMEOUT', ''],
      }
      const result = RetryPolicySchema.safeParse(policy)
      expect(result.success).toBe(false)
    })

    it('accepts empty retryableErrorCodes array', () => {
      const policy = {
        maxAttempts: 3,
        backoffMs: 100,
        retryableErrorCodes: [],
      }
      const result = RetryPolicySchema.safeParse(policy)
      expect(result.success).toBe(true)
    })
  })

  describe('TimeoutPolicySchema', () => {
    it('validates valid timeout policy', () => {
      const policy = {
        stepTimeoutMs: 5000,
      }
      const result = TimeoutPolicySchema.safeParse(policy)
      expect(result.success).toBe(true)
    })

    it('validates timeout policy with totalTimeoutMs', () => {
      const policy = {
        stepTimeoutMs: 5000,
        totalTimeoutMs: 60000,
      }
      const result = TimeoutPolicySchema.safeParse(policy)
      expect(result.success).toBe(true)
    })

    it('rejects stepTimeoutMs less than 100ms', () => {
      const policy = {
        stepTimeoutMs: 99,
      }
      const result = TimeoutPolicySchema.safeParse(policy)
      expect(result.success).toBe(false)
    })

    it('rejects stepTimeoutMs greater than 1 hour', () => {
      const policy = {
        stepTimeoutMs: 3600001,
      }
      const result = TimeoutPolicySchema.safeParse(policy)
      expect(result.success).toBe(false)
    })

    it('rejects totalTimeoutMs less than 100ms', () => {
      const policy = {
        stepTimeoutMs: 1000,
        totalTimeoutMs: 99,
      }
      const result = TimeoutPolicySchema.safeParse(policy)
      expect(result.success).toBe(false)
    })

    it('rejects totalTimeoutMs greater than 24 hours', () => {
      const policy = {
        stepTimeoutMs: 1000,
        totalTimeoutMs: 86400001,
      }
      const result = TimeoutPolicySchema.safeParse(policy)
      expect(result.success).toBe(false)
    })
  })

  describe('StepExecutionResultSchema', () => {
    it('validates successful execution', () => {
      const result = {
        status: StepStatus.SUCCEEDED,
        output: { data: 'test' },
        retryable: false,
      }
      const parsed = StepExecutionResultSchema.safeParse(result)
      expect(parsed.success).toBe(true)
    })

    it('validates failed execution with error details', () => {
      const result = {
        status: StepStatus.FAILED,
        errorCode: 'AGENT_ERROR',
        errorMessage: 'Agent failed',
        retryable: true,
        durationMs: 5000,
      }
      const parsed = StepExecutionResultSchema.safeParse(result)
      expect(parsed.success).toBe(true)
    })

    it('validates pending status', () => {
      const result = {
        status: StepStatus.PENDING,
        retryable: false,
      }
      const parsed = StepExecutionResultSchema.safeParse(result)
      expect(parsed.success).toBe(true)
    })

    it('validates running status', () => {
      const result = {
        status: StepStatus.RUNNING,
        retryable: false,
      }
      const parsed = StepExecutionResultSchema.safeParse(result)
      expect(parsed.success).toBe(true)
    })

    it('validates skipped status', () => {
      const result = {
        status: StepStatus.SKIPPED,
        retryable: false,
      }
      const parsed = StepExecutionResultSchema.safeParse(result)
      expect(parsed.success).toBe(true)
    })

    it('rejects negative durationMs', () => {
      const result = {
        status: StepStatus.SUCCEEDED,
        retryable: false,
        durationMs: -1,
      }
      const parsed = StepExecutionResultSchema.safeParse(result)
      expect(parsed.success).toBe(false)
    })

    it('requires retryable field', () => {
      const result = {
        status: StepStatus.SUCCEEDED,
        output: { data: 'test' },
      }
      const parsed = StepExecutionResultSchema.safeParse(result)
      expect(parsed.success).toBe(false)
    })
  })

  describe('classifyError', () => {
    it('returns retryable for known error code', () => {
      const result = classifyError('TIMEOUT', ['TIMEOUT', 'RATE_LIMIT'])
      expect(result).toBe('retryable')
    })

    it('returns non_retryable for unknown error code', () => {
      const result = classifyError('FATAL_ERROR', ['TIMEOUT'])
      expect(result).toBe('non_retryable')
    })

    it('returns timeout when isTimeout flag set', () => {
      const result = classifyError('ANY_ERROR', ['TIMEOUT'], true)
      expect(result).toBe('timeout')
    })

    it('returns timeout even if error code is retryable', () => {
      const result = classifyError('TIMEOUT', ['TIMEOUT'], true)
      expect(result).toBe('timeout')
    })

    it('handles empty retryable error codes', () => {
      const result = classifyError('ERROR', [])
      expect(result).toBe('non_retryable')
    })

    it('handles case-sensitive error codes', () => {
      const result = classifyError('timeout', ['TIMEOUT'])
      expect(result).toBe('non_retryable')
    })
  })

  describe('validateStepConfig', () => {
    it('returns config on valid input', () => {
      const config = {
        key: 'step-1',
        type: StepType.APPROVAL,
        config: {},
      }
      const result = validateStepConfig(config)
      expect(result.key).toBe('step-1')
      expect(result.type).toBe(StepType.APPROVAL)
    })

    it('returns config with policies', () => {
      const config = {
        key: 'step-1',
        type: StepType.AGENT,
        config: { model: 'gpt-4' },
        retryPolicy: {
          maxAttempts: 3,
          backoffMs: 100,
          retryableErrorCodes: ['TIMEOUT'],
        },
      }
      const result = validateStepConfig(config)
      expect(result.retryPolicy).toBeDefined()
      expect(result.retryPolicy?.maxAttempts).toBe(3)
    })

    it('throws InvalidStepConfigError on invalid input', () => {
      const config = {
        key: '',
        type: 'invalid',
        config: {},
      }
      expect(() => validateStepConfig(config)).toThrow(InvalidStepConfigError)
    })

    it('throws with descriptive error message', () => {
      const config = {
        key: 'step-1',
        type: StepType.TOOL,
      }
      expect(() => validateStepConfig(config)).toThrow(/Invalid step configuration/)
    })
  })

  describe('shouldRetryStep', () => {
    const policy = {
      maxAttempts: 3,
      backoffMs: 100,
      retryableErrorCodes: ['TIMEOUT', 'RATE_LIMIT'],
    }

    it('returns true when error is retryable and attempts remain', () => {
      const result = {
        status: StepStatus.FAILED,
        errorCode: 'TIMEOUT',
        retryable: true,
      }
      expect(shouldRetryStep(result, policy, 1)).toBe(true)
    })

    it('returns true on second attempt', () => {
      const result = {
        status: StepStatus.FAILED,
        errorCode: 'TIMEOUT',
        retryable: true,
      }
      expect(shouldRetryStep(result, policy, 2)).toBe(true)
    })

    it('returns false when no attempts remain', () => {
      const result = {
        status: StepStatus.FAILED,
        errorCode: 'TIMEOUT',
        retryable: true,
      }
      expect(shouldRetryStep(result, policy, 3)).toBe(false)
    })

    it('returns false when exceeded maxAttempts', () => {
      const result = {
        status: StepStatus.FAILED,
        errorCode: 'TIMEOUT',
        retryable: true,
      }
      expect(shouldRetryStep(result, policy, 4)).toBe(false)
    })

    it('returns false when error not in retryable list', () => {
      const result = {
        status: StepStatus.FAILED,
        errorCode: 'FATAL_ERROR',
        retryable: true,
      }
      expect(shouldRetryStep(result, policy, 1)).toBe(false)
    })

    it('returns false when result is not retryable', () => {
      const result = {
        status: StepStatus.FAILED,
        errorCode: 'TIMEOUT',
        retryable: false,
      }
      expect(shouldRetryStep(result, policy, 1)).toBe(false)
    })

    it('returns false when no error code', () => {
      const result = {
        status: StepStatus.FAILED,
        retryable: true,
      }
      expect(shouldRetryStep(result, policy, 1)).toBe(false)
    })

    it('handles zero attempts (edge case)', () => {
      const result = {
        status: StepStatus.FAILED,
        errorCode: 'TIMEOUT',
        retryable: true,
      }
      expect(shouldRetryStep(result, policy, 0)).toBe(true)
    })

    it('handles empty retryableErrorCodes', () => {
      const emptyPolicy = {
        maxAttempts: 3,
        backoffMs: 100,
        retryableErrorCodes: [],
      }
      const result = {
        status: StepStatus.FAILED,
        errorCode: 'TIMEOUT',
        retryable: true,
      }
      expect(shouldRetryStep(result, emptyPolicy, 1)).toBe(false)
    })
  })

  describe('calculateBackoffDelay', () => {
    it('calculates linear backoff for attempt 1', () => {
      expect(calculateBackoffDelay(1, 100, 'linear')).toBe(100)
    })

    it('calculates linear backoff for attempt 2', () => {
      expect(calculateBackoffDelay(2, 100, 'linear')).toBe(200)
    })

    it('calculates linear backoff for attempt 3', () => {
      expect(calculateBackoffDelay(3, 100, 'linear')).toBe(300)
    })

    it('calculates exponential backoff for attempt 1', () => {
      expect(calculateBackoffDelay(1, 100, 'exponential')).toBe(100)
    })

    it('calculates exponential backoff for attempt 2', () => {
      expect(calculateBackoffDelay(2, 100, 'exponential')).toBe(200)
    })

    it('calculates exponential backoff for attempt 3', () => {
      expect(calculateBackoffDelay(3, 100, 'exponential')).toBe(400)
    })

    it('calculates exponential backoff for attempt 4', () => {
      expect(calculateBackoffDelay(4, 100, 'exponential')).toBe(800)
    })

    it('defaults to exponential strategy', () => {
      expect(calculateBackoffDelay(2, 100)).toBe(200)
      expect(calculateBackoffDelay(3, 100)).toBe(400)
    })

    it('handles different base backoff values', () => {
      expect(calculateBackoffDelay(2, 500, 'exponential')).toBe(1000)
      expect(calculateBackoffDelay(3, 500, 'exponential')).toBe(2000)
    })

    it('handles large attempt numbers', () => {
      expect(calculateBackoffDelay(10, 100, 'exponential')).toBe(51200)
    })

    it('handles zero base backoff', () => {
      expect(calculateBackoffDelay(1, 0, 'linear')).toBe(0)
      expect(calculateBackoffDelay(2, 0, 'exponential')).toBe(0)
    })
  })

  describe('StepExecutionError', () => {
    it('creates error with metadata', () => {
      const error = new StepExecutionError('Execution failed', 'AGENT_FAILED', true)
      expect(error.message).toBe('Execution failed')
      expect(error.errorCode).toBe('AGENT_FAILED')
      expect(error.retryable).toBe(true)
      expect(error.name).toBe('StepExecutionError')
    })

    it('defaults retryable to false', () => {
      const error = new StepExecutionError('Execution failed', 'FATAL_ERROR')
      expect(error.retryable).toBe(false)
    })

    it('is instanceof Error', () => {
      const error = new StepExecutionError('Test', 'TEST_ERROR')
      expect(error instanceof Error).toBe(true)
    })
  })

  describe('InvalidStepConfigError', () => {
    it('creates error with message', () => {
      const error = new InvalidStepConfigError('Invalid config')
      expect(error.message).toBe('Invalid config')
      expect(error.name).toBe('InvalidStepConfigError')
    })

    it('is instanceof Error', () => {
      const error = new InvalidStepConfigError('Test')
      expect(error instanceof Error).toBe(true)
    })
  })
})
