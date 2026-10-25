import { z } from 'zod'

import { InvalidStepStateError } from '../errors/invalid-step-state.error'
import { StepStatus } from '../step-types'

// Re-export StepStatus for convenience
export { StepStatus }

/**
 * Schema for StepRun validation
 */
export const StepRunSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  organizationId: z.string().uuid(),
  stepKey: z.string().min(1),
  stepType: z.string().min(1),
  status: z.nativeEnum(StepStatus),
  attempt: z.number().int().min(1),
  input: z.any().optional(),
  output: z.any().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type StepRun = z.infer<typeof StepRunSchema>

/**
 * Validate step run data
 */
function validateStepRun(data: unknown): StepRun {
  const parsed = StepRunSchema.safeParse(data)
  if (!parsed.success) {
    throw new InvalidStepStateError(`Invalid step run: ${parsed.error.message}`)
  }
  return parsed.data
}

/**
 * Status check functions
 */
export function isStepRunning(step: StepRun): boolean {
  return step.status === StepStatus.RUNNING
}

export function isStepTerminal(step: StepRun): boolean {
  return [StepStatus.SUCCEEDED, StepStatus.FAILED, StepStatus.SKIPPED].includes(step.status)
}

export function isStepSucceeded(step: StepRun): boolean {
  return step.status === StepStatus.SUCCEEDED
}

export function isStepFailed(step: StepRun): boolean {
  return step.status === StepStatus.FAILED
}

/**
 * Retry logic functions
 */
export function incrementAttempt(step: StepRun): StepRun {
  return validateStepRun({
    ...step,
    attempt: step.attempt + 1,
    updatedAt: new Date(),
  })
}

/**
 * Lifecycle transition functions
 */
export function startStepRun(step: StepRun): StepRun {
  if (step.status !== StepStatus.PENDING) {
    throw new InvalidStepStateError(`Cannot start step: current status is ${step.status}`)
  }

  return validateStepRun({
    ...step,
    status: StepStatus.RUNNING,
    startedAt: new Date(),
    updatedAt: new Date(),
  })
}

export function succeedStepRun(step: StepRun, output?: unknown): StepRun {
  if (!isStepRunning(step)) {
    throw new InvalidStepStateError(`Cannot succeed step: current status is ${step.status}`)
  }

  return validateStepRun({
    ...step,
    status: StepStatus.SUCCEEDED,
    output,
    completedAt: new Date(),
    updatedAt: new Date(),
  })
}

export function failStepRun(step: StepRun, errorCode: string, errorMessage: string): StepRun {
  if (!isStepRunning(step)) {
    throw new InvalidStepStateError(`Cannot fail step: current status is ${step.status}`)
  }

  return validateStepRun({
    ...step,
    status: StepStatus.FAILED,
    errorCode,
    errorMessage,
    completedAt: new Date(),
    updatedAt: new Date(),
  })
}

export function skipStepRun(step: StepRun): StepRun {
  if (step.status !== StepStatus.PENDING) {
    throw new InvalidStepStateError(`Cannot skip step: current status is ${step.status}`)
  }

  return validateStepRun({
    ...step,
    status: StepStatus.SKIPPED,
    completedAt: new Date(),
    updatedAt: new Date(),
  })
}

/**
 * Factory function to create a new step run
 */
export function createStepRun(
  data: Partial<StepRun> & Required<Pick<StepRun, 'id' | 'runId' | 'stepKey' | 'organizationId' | 'stepType'>>
): StepRun {
  const now = new Date()
  const full: StepRun = {
    status: StepStatus.PENDING,
    attempt: 1,
    createdAt: now,
    updatedAt: now,
    ...data,
  }

  return validateStepRun(full)
}
