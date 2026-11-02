import { z } from 'zod'

export enum SubTaskStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_DEPENDENCY = 'WAITING_DEPENDENCY',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
}

export enum SubTaskDependencyType {
  INDEPENDENT = 'INDEPENDENT',
  SEQUENTIAL = 'SEQUENTIAL',
  DEPENDENT = 'DEPENDENT',
}

export enum SubTaskAgentRole {
  DEVELOPER = 'DEVELOPER',
  CODE_REVIEWER = 'CODE_REVIEWER',
  QA = 'QA',
}

// Zod schema for validation
export const SubTaskEntitySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  workflowId: z.string().uuid(),
  phaseId: z.string().uuid().nullable(),
  key: z.string().min(1).max(100),
  type: z.string(),
  title: z.string().min(1).max(500),
  description: z.string().nullable(),
  parentId: z.string().uuid().nullable(),
  acceptanceCriteria: z.record(z.string(), z.unknown()).nullable(),
  status: z.nativeEnum(SubTaskStatus),
  dependencyType: z.nativeEnum(SubTaskDependencyType),
  executionOrder: z.number().int().min(0),
  assignedAgentRole: z.nativeEnum(SubTaskAgentRole).nullable(),
  priority: z.string().nullable(),
  estimate: z.record(z.string(), z.unknown()).nullable(),
  sequence: z.number().int().min(0),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type SubTaskEntity = z.infer<typeof SubTaskEntitySchema>

// Zod schema for SubTask dependencies
export const SubTaskDependencySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  workflowId: z.string().uuid(),
  dependentItemId: z.string().uuid(),
  dependsOnItemId: z.string().uuid(),
  type: z.string(),
  createdAt: z.coerce.date(),
})

export type SubTaskDependency = z.infer<typeof SubTaskDependencySchema>

// Validation helpers
export function validateSubTaskEntity(data: unknown): SubTaskEntity {
  return SubTaskEntitySchema.parse(data)
}

export function validateSubTaskDependency(data: unknown): SubTaskDependency {
  return SubTaskDependencySchema.parse(data)
}

// Status transition validation
export function isValidStatusTransition(from: SubTaskStatus, to: SubTaskStatus): boolean {
  const validTransitions: Record<SubTaskStatus, SubTaskStatus[]> = {
    [SubTaskStatus.PENDING]: [SubTaskStatus.READY, SubTaskStatus.BLOCKED],
    [SubTaskStatus.READY]: [SubTaskStatus.IN_PROGRESS, SubTaskStatus.BLOCKED],
    [SubTaskStatus.IN_PROGRESS]: [
      SubTaskStatus.COMPLETED,
      SubTaskStatus.FAILED,
      SubTaskStatus.WAITING_DEPENDENCY,
      SubTaskStatus.BLOCKED,
    ],
    [SubTaskStatus.WAITING_DEPENDENCY]: [SubTaskStatus.READY, SubTaskStatus.BLOCKED],
    [SubTaskStatus.COMPLETED]: [],
    [SubTaskStatus.FAILED]: [SubTaskStatus.READY, SubTaskStatus.BLOCKED],
    [SubTaskStatus.BLOCKED]: [SubTaskStatus.READY, SubTaskStatus.FAILED],
  }

  return validTransitions[from]?.includes(to) ?? false
}
