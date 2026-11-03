import { z } from 'zod'

import { EventType } from '../entities/event.entity'

/**
 * Base event schema for all events
 */
export const BaseEventSchema = z.object({
  type: z.nativeEnum(EventType),
  workflowId: z.string().uuid('workflowId must be a valid UUID'),
  timestamp: z.number().positive('timestamp must be a positive number'),
  traceId: z.string().uuid('traceId must be a valid UUID').optional(),
})

/**
 * Agent message user event schema
 */
export const AgentMessageUserEventSchema = BaseEventSchema.extend({
  type: z.literal(EventType.AGENT_MESSAGE_USER),
  sessionId: z.string().uuid('sessionId must be a valid UUID'),
  userId: z.string().uuid('userId must be a valid UUID'),
  message: z.string().min(1, 'message cannot be empty'),
  metadata: z.object({
    repoPath: z.string().min(1, 'repoPath cannot be empty'),
    orgId: z.string().uuid('orgId must be a valid UUID'),
    projectId: z.string().uuid('projectId must be a valid UUID'),
  }),
})

/**
 * Agent message delta event schema
 */
export const AgentMessageDeltaEventSchema = BaseEventSchema.extend({
  type: z.literal(EventType.AGENT_MESSAGE_DELTA),
  sessionId: z.string().uuid('sessionId must be a valid UUID'),
  content: z.string(),
})

/**
 * Agent message complete event schema
 */
export const AgentMessageCompleteEventSchema = BaseEventSchema.extend({
  type: z.literal(EventType.AGENT_MESSAGE_COMPLETE),
  sessionId: z.string().uuid('sessionId must be a valid UUID'),
  messageId: z.string().uuid('messageId must be a valid UUID'),
  content: z.string(),
  metadata: z.object({
    orgId: z.string().uuid('orgId must be a valid UUID'),
    projectId: z.string().uuid('projectId must be a valid UUID'),
  }),
})

/**
 * Agent tool use event schema
 */
export const AgentToolUseEventSchema = BaseEventSchema.extend({
  type: z.literal(EventType.AGENT_TOOL_USE),
  toolName: z.enum(['Write', 'Edit', 'Read', 'Glob', 'Grep']),
  toolInput: z.object({
    file_path: z.string().optional(),
    content: z.string().optional(),
    pattern: z.string().optional(),
  }),
  metadata: z.object({
    repoPath: z.string().min(1, 'repoPath cannot be empty'),
    orgId: z.string().uuid('orgId must be a valid UUID'),
    projectId: z.string().uuid('projectId must be a valid UUID'),
  }),
})

/**
 * Artifact created event schema
 */
export const ArtifactCreatedEventSchema = BaseEventSchema.extend({
  type: z.literal(EventType.ARTIFACT_CREATED),
  artifactId: z.string().uuid('artifactId must be a valid UUID'),
  filePath: z.string().min(1, 'filePath cannot be empty'),
  artifactType: z.string().min(1, 'artifactType cannot be empty'),
})

/**
 * Phase approved event schema
 */
export const PhaseApprovedEventSchema = BaseEventSchema.extend({
  type: z.literal(EventType.PHASE_APPROVED),
  phaseId: z.string().uuid('phaseId must be a valid UUID'),
  phaseKey: z.string().min(1, 'phaseKey cannot be empty'),
  nextPhaseKey: z.string().min(1, 'nextPhaseKey cannot be empty'),
  metadata: z.object({
    orgId: z.string().uuid('orgId must be a valid UUID'),
    projectId: z.string().uuid('projectId must be a valid UUID'),
  }),
})

/**
 * Union schema for all events (discriminated union)
 */
export const AgentEventSchema = z.discriminatedUnion('type', [
  AgentMessageUserEventSchema,
  AgentMessageDeltaEventSchema,
  AgentMessageCompleteEventSchema,
  AgentToolUseEventSchema,
  ArtifactCreatedEventSchema,
  PhaseApprovedEventSchema,
])

/**
 * Type inference from schemas
 */
export type AgentMessageUserEventValidated = z.infer<typeof AgentMessageUserEventSchema>
export type AgentMessageDeltaEventValidated = z.infer<typeof AgentMessageDeltaEventSchema>
export type AgentMessageCompleteEventValidated = z.infer<typeof AgentMessageCompleteEventSchema>
export type AgentToolUseEventValidated = z.infer<typeof AgentToolUseEventSchema>
export type ArtifactCreatedEventValidated = z.infer<typeof ArtifactCreatedEventSchema>
export type PhaseApprovedEventValidated = z.infer<typeof PhaseApprovedEventSchema>
export type AgentEventValidated = z.infer<typeof AgentEventSchema>
