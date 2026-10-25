import { z } from 'zod'

import { AgentExecutionStatus, AgentType, ArtifactType } from './agent-types'

/**
 * Agent config schema
 */
export const AgentConfigSchema = z
  .object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
  })
  .passthrough()

/**
 * Artifact reference schema
 */
export const ArtifactReferenceSchema = z.object({
  type: z.nativeEnum(ArtifactType),
  path: z.string().min(1),
  size: z.number().int().positive().optional(),
})

/**
 * Usage metrics schema
 */
export const UsageMetricsSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  durationMs: z.number().int().positive(),
})

/**
 * Agent execution input schema
 */
export const AgentExecutionInputSchema = z.object({
  agentType: z.nativeEnum(AgentType),
  requirement: z.string().min(1),
  planContext: z.string().optional(),
  repoPath: z.string().min(1),
  workspacePath: z.string().min(1),
  timeoutMs: z.number().int().positive(),
  config: AgentConfigSchema,
})

/**
 * Agent execution result schema
 */
export const AgentExecutionResultSchema = z.object({
  status: z.nativeEnum(AgentExecutionStatus),
  output: z.string().optional(),
  artifacts: z.array(ArtifactReferenceSchema),
  usage: UsageMetricsSchema.optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  exitStatus: z.number().int().optional(),
})
