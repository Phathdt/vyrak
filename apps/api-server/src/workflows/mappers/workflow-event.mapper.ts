import type { WorkflowEventEntity } from '@vyrak/workflow-core'

import type { WorkflowEventResponseDto } from '../dto'

const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'apikey',
  'privatekey',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'bearer',
]

function redactSensitiveData(payload: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(payload)) {
    const keyLower = key.toLowerCase()
    if (SENSITIVE_KEYS.some((sensitive) => keyLower.includes(sensitive))) {
      redacted[key] = '[REDACTED]'
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactSensitiveData(value as Record<string, unknown>)
    } else {
      redacted[key] = value
    }
  }

  return redacted
}

export function toWorkflowEventResponseDto(event: WorkflowEventEntity): WorkflowEventResponseDto {
  return {
    id: event.id,
    runId: event.runId,
    eventType: event.eventType,
    payload: redactSensitiveData(event.payload as Record<string, unknown>),
    sequence: event.sequence,
    createdAt: event.createdAt.toISOString(),
  }
}
