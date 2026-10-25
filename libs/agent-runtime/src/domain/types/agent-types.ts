/**
 * Agent type for different execution modes
 */
export enum AgentType {
  PLANNER = 'planner',
  IMPLEMENTER = 'implementer',
  REVIEWER = 'reviewer',
}

/**
 * Agent execution status
 */
export enum AgentExecutionStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

/**
 * Artifact type for agent outputs
 */
export enum ArtifactType {
  REQUIREMENT = 'requirement',
  PLAN = 'plan',
  IMPLEMENTATION = 'implementation',
  TEST_RESULTS = 'test_results',
  REVIEW = 'review',
  REPORT = 'report',
}

/**
 * Artifact reference from agent execution
 */
export interface ArtifactReference {
  type: ArtifactType
  path: string
  size?: number
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  model?: string
  temperature?: number
  maxTokens?: number
  [key: string]: unknown
}

/**
 * Usage metrics
 */
export interface UsageMetrics {
  inputTokens: number
  outputTokens: number
  durationMs: number
}
