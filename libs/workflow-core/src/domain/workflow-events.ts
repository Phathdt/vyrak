import { z } from 'zod'

/**
 * All workflow lifecycle events
 */
export enum WorkflowEventType {
  RUN_CREATED = 'run_created',
  STEP_STARTED = 'step_started',
  STEP_COMPLETED = 'step_completed',
  APPROVAL_REQUESTED = 'approval_requested',
  APPROVAL_DECIDED = 'approval_decided',
  RUN_SUCCEEDED = 'run_succeeded',
  RUN_FAILED = 'run_failed',
  RUN_CANCELLED = 'run_cancelled',
  RETRY_SCHEDULED = 'retry_scheduled',
  RECOVERY_PERFORMED = 'recovery_performed',
}

/**
 * Event payloads for each event type
 */

export interface RunCreatedPayload {
  workflowKey: string
  workflowVersion: string
  projectId: string
  initiatedByUserId: string
  idempotencyKey: string
}

export interface StepStartedPayload {
  stepKey: string
  stepType: string
  attempt: number
}

export interface StepCompletedPayload {
  stepKey: string
  status: string
  durationMs: number
  errorCode?: string
  errorMessage?: string
  errorClassification?: 'retryable' | 'non_retryable' | 'timeout'
}

export interface ApprovalRequestedPayload {
  stepKey: string
  requiredApprovers: string[]
  approvalDeadlineAt?: Date
}

export interface ApprovalDecidedPayload {
  stepKey: string
  decision: 'approved' | 'rejected'
  approvedByUserId: string
  reason?: string
}

export interface RunSucceededPayload {
  totalDurationMs: number
  stepCount: number
}

export interface RunFailedPayload {
  failedStepKey: string
  errorCode: string
  errorMessage: string
}

export interface RunCancelledPayload {
  reason: string
  cancelledByUserId?: string
}

export interface RetryScheduledPayload {
  stepKey: string
  nextAttempt: number
  scheduledForMs: number
  reason: string
}

export interface RecoveryPerformedPayload {
  recoveryType: string
  affectedStepKey?: string
  recoveryResult: 'success' | 'failure'
}

/**
 * Zod schemas for payload validation
 */

export const RunCreatedPayloadSchema = z.object({
  workflowKey: z.string().min(1),
  workflowVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  projectId: z.string().uuid(),
  initiatedByUserId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
})

export const StepStartedPayloadSchema = z.object({
  stepKey: z.string().min(1),
  stepType: z.string().min(1),
  attempt: z.number().int().min(1),
})

export const StepCompletedPayloadSchema = z.object({
  stepKey: z.string().min(1),
  status: z.string().min(1),
  durationMs: z.number().int().min(0),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  errorClassification: z.enum(['retryable', 'non_retryable', 'timeout']).optional(),
})

export const ApprovalRequestedPayloadSchema = z.object({
  stepKey: z.string().min(1),
  requiredApprovers: z.array(z.string().uuid()),
  approvalDeadlineAt: z.date().optional(),
})

export const ApprovalDecidedPayloadSchema = z.object({
  stepKey: z.string().min(1),
  decision: z.enum(['approved', 'rejected']),
  approvedByUserId: z.string().uuid(),
  reason: z.string().optional(),
})

export const RunSucceededPayloadSchema = z.object({
  totalDurationMs: z.number().int().min(0),
  stepCount: z.number().int().min(1),
})

export const RunFailedPayloadSchema = z.object({
  failedStepKey: z.string().min(1),
  errorCode: z.string().min(1),
  errorMessage: z.string().min(1),
})

export const RunCancelledPayloadSchema = z.object({
  reason: z.string().min(1),
  cancelledByUserId: z.string().uuid().optional(),
})

export const RetryScheduledPayloadSchema = z.object({
  stepKey: z.string().min(1),
  nextAttempt: z.number().int().min(1),
  scheduledForMs: z.number().int().min(0),
  reason: z.string().min(1),
})

export const RecoveryPerformedPayloadSchema = z.object({
  recoveryType: z.string().min(1),
  affectedStepKey: z.string().optional(),
  recoveryResult: z.enum(['success', 'failure']),
})

/**
 * Map event types to their payload schemas
 */
const PAYLOAD_SCHEMAS: Record<WorkflowEventType, z.ZodSchema> = {
  [WorkflowEventType.RUN_CREATED]: RunCreatedPayloadSchema,
  [WorkflowEventType.STEP_STARTED]: StepStartedPayloadSchema,
  [WorkflowEventType.STEP_COMPLETED]: StepCompletedPayloadSchema,
  [WorkflowEventType.APPROVAL_REQUESTED]: ApprovalRequestedPayloadSchema,
  [WorkflowEventType.APPROVAL_DECIDED]: ApprovalDecidedPayloadSchema,
  [WorkflowEventType.RUN_SUCCEEDED]: RunSucceededPayloadSchema,
  [WorkflowEventType.RUN_FAILED]: RunFailedPayloadSchema,
  [WorkflowEventType.RUN_CANCELLED]: RunCancelledPayloadSchema,
  [WorkflowEventType.RETRY_SCHEDULED]: RetryScheduledPayloadSchema,
  [WorkflowEventType.RECOVERY_PERFORMED]: RecoveryPerformedPayloadSchema,
}

/**
 * Core workflow event
 */
export interface WorkflowEvent {
  id: string
  runId: string
  organizationId: string
  eventType: WorkflowEventType
  sequence: number
  payload: unknown
  metadata?: Record<string, unknown>
  createdAt: Date
}

/**
 * Zod schema for complete event
 */
export const WorkflowEventSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  organizationId: z.string().uuid(),
  eventType: z.nativeEnum(WorkflowEventType),
  sequence: z.number().int().min(1),
  payload: z.unknown(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
})

export type WorkflowEventData = z.infer<typeof WorkflowEventSchema>

/**
 * Validate event payload against schema for its type
 * @throws InvalidEventPayloadError
 */
export function validateEventPayload(eventType: WorkflowEventType, payload: unknown): unknown {
  const schema = PAYLOAD_SCHEMAS[eventType]
  if (!schema) {
    throw new InvalidEventPayloadError(`Unknown event type: ${eventType}`)
  }

  try {
    return schema.parse(payload)
  } catch (error) {
    throw new InvalidEventPayloadError(
      `Invalid payload for ${eventType}: ${error instanceof Error ? error.message : 'unknown error'}`
    )
  }
}

/**
 * Create a workflow event with validation
 */
export function createWorkflowEvent(
  runId: string,
  organizationId: string,
  eventType: WorkflowEventType,
  sequence: number,
  payload: unknown,
  metadata?: Record<string, unknown>
): WorkflowEvent {
  const validatedPayload = validateEventPayload(eventType, payload)

  return {
    id: generateUUID(),
    runId,
    organizationId,
    eventType,
    sequence,
    payload: validatedPayload,
    metadata,
    createdAt: new Date(),
  }
}

/**
 * Sensitive fields to redact from events
 * We match exact field names or common patterns, but avoid overly broad matches
 */
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'apikey', 'authorization']

/**
 * Remove sensitive data from event for logging/storage
 */
export function sanitizeEvent(event: WorkflowEvent): WorkflowEvent {
  return {
    ...event,
    payload: sanitizeObject(event.payload),
    metadata: event.metadata ? (sanitizeObject(event.metadata) as Record<string, unknown>) : undefined,
  }
}

/**
 * Recursively sanitize an object, removing sensitive fields
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = sanitizeObject(value)
    }
  }
  return sanitized
}

/**
 * Simple UUID generator
 * In real implementation, import from 'uuid' package
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Type guards for event payloads
 */
export function isRunCreatedPayload(payload: unknown): payload is RunCreatedPayload {
  return RunCreatedPayloadSchema.safeParse(payload).success
}

export function isStepStartedPayload(payload: unknown): payload is StepStartedPayload {
  return StepStartedPayloadSchema.safeParse(payload).success
}

export function isStepCompletedPayload(payload: unknown): payload is StepCompletedPayload {
  return StepCompletedPayloadSchema.safeParse(payload).success
}

export function isApprovalRequestedPayload(payload: unknown): payload is ApprovalRequestedPayload {
  return ApprovalRequestedPayloadSchema.safeParse(payload).success
}

export function isApprovalDecidedPayload(payload: unknown): payload is ApprovalDecidedPayload {
  return ApprovalDecidedPayloadSchema.safeParse(payload).success
}

export function isRunSucceededPayload(payload: unknown): payload is RunSucceededPayload {
  return RunSucceededPayloadSchema.safeParse(payload).success
}

export function isRunFailedPayload(payload: unknown): payload is RunFailedPayload {
  return RunFailedPayloadSchema.safeParse(payload).success
}

export function isRunCancelledPayload(payload: unknown): payload is RunCancelledPayload {
  return RunCancelledPayloadSchema.safeParse(payload).success
}

export function isRetryScheduledPayload(payload: unknown): payload is RetryScheduledPayload {
  return RetryScheduledPayloadSchema.safeParse(payload).success
}

export function isRecoveryPerformedPayload(payload: unknown): payload is RecoveryPerformedPayload {
  return RecoveryPerformedPayloadSchema.safeParse(payload).success
}

// Domain errors

export class InvalidEventPayloadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidEventPayloadError'

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidEventPayloadError)
    }
  }
}
