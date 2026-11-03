/**
 * Event types for the event bus
 */
export enum EventType {
  // User messages
  AGENT_MESSAGE_USER = 'agent.message.user',
  AGENT_MESSAGE_DELTA = 'agent.message.delta',
  AGENT_MESSAGE_COMPLETE = 'agent.message.complete',

  // Tool usage
  AGENT_TOOL_USE = 'agent.tool_use',
  AGENT_TOOL_RESULT = 'agent.tool_result',

  // Artifacts
  ARTIFACT_CREATED = 'artifact.created',
  ARTIFACT_UPDATED = 'artifact.updated',

  // Presence
  USER_JOINED = 'user.joined',
  USER_LEFT = 'user.left',
  USER_TYPING = 'user.typing',

  // Phase transitions
  PHASE_APPROVED = 'phase.approved',
}

/**
 * Base event interface
 */
export interface BaseEvent {
  type: EventType
  workflowId: string
  timestamp: number
  traceId?: string
}

/**
 * User message event
 */
export interface AgentMessageUserEvent extends BaseEvent {
  type: EventType.AGENT_MESSAGE_USER
  sessionId: string
  userId: string
  message: string
  metadata: {
    repoPath: string
    orgId: string
    projectId: string
  }
}

/**
 * Message delta event (streaming chunks)
 */
export interface AgentMessageDeltaEvent extends BaseEvent {
  type: EventType.AGENT_MESSAGE_DELTA
  sessionId: string
  content: string
}

/**
 * Message completion event
 */
export interface AgentMessageCompleteEvent extends BaseEvent {
  type: EventType.AGENT_MESSAGE_COMPLETE
  sessionId: string
  messageId: string
  content: string
  metadata: {
    orgId: string
    projectId: string
  }
}

/**
 * Tool use event (Write, Edit, Read, etc)
 */
export interface AgentToolUseEvent extends BaseEvent {
  type: EventType.AGENT_TOOL_USE
  toolName: 'Write' | 'Edit' | 'Read' | 'Glob' | 'Grep'
  toolInput: {
    file_path?: string
    content?: string
    pattern?: string
  }
  metadata: {
    repoPath: string
    orgId: string
    projectId: string
  }
}

/**
 * Artifact created event
 */
export interface ArtifactCreatedEvent extends BaseEvent {
  type: EventType.ARTIFACT_CREATED
  artifactId: string
  filePath: string
  artifactType: string
}

/**
 * Phase approved event (triggers the next workflow phase)
 */
export interface PhaseApprovedEvent extends BaseEvent {
  type: EventType.PHASE_APPROVED
  phaseId: string
  phaseKey: string
  nextPhaseKey: string
  metadata: {
    orgId: string
    projectId: string
  }
}

/**
 * Union type of all events
 */
export type AgentEvent =
  | AgentMessageUserEvent
  | AgentMessageDeltaEvent
  | AgentMessageCompleteEvent
  | AgentToolUseEvent
  | ArtifactCreatedEvent
  | PhaseApprovedEvent
