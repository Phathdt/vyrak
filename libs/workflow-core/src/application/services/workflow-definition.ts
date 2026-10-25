import { RetryPolicy, StepType } from '../../domain'

/**
 * Step definition in a workflow
 * Represents a single step with its configuration
 */
export interface StepDefinition {
  key: string
  type: StepType
  retryPolicy?: RetryPolicy
  timeoutMs?: number
  config?: Record<string, unknown>
}

/**
 * Complete workflow definition
 * Contains all steps and metadata for a workflow
 */
export interface WorkflowDefinition {
  key: string
  version: string
  steps: StepDefinition[]
}

/**
 * Hardcoded workflow definitions
 * TODO: Move to database in future stories
 */
export const WORKFLOW_DEFINITIONS: Record<string, WorkflowDefinition> = {
  'ai-sdlc-v1': {
    key: 'ai-sdlc-v1',
    version: '1.0',
    steps: [
      {
        key: 'plan',
        type: StepType.AGENT,
        retryPolicy: {
          maxAttempts: 3,
          backoffMs: 1000,
          retryableErrorCodes: ['TIMEOUT', 'RATE_LIMIT'],
        },
        timeoutMs: 300000, // 5 minutes
      },
      {
        key: 'approval',
        type: StepType.APPROVAL,
        timeoutMs: 86400000, // 24 hours
      },
      {
        key: 'implement',
        type: StepType.AGENT,
        retryPolicy: {
          maxAttempts: 2,
          backoffMs: 2000,
          retryableErrorCodes: ['TIMEOUT'],
        },
        timeoutMs: 600000, // 10 minutes
      },
    ],
  },
}

/**
 * Get workflow definition by key
 * @throws Error if workflow definition not found
 */
export function getWorkflowDefinition(workflowKey: string): WorkflowDefinition {
  const definition = WORKFLOW_DEFINITIONS[workflowKey]
  if (!definition) {
    throw new Error(`Workflow definition not found: ${workflowKey}`)
  }
  return definition
}
