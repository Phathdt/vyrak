import { z } from 'zod'

export const PhaseExecutionStatus = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  AWAITING_USER: 'AWAITING_USER',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
} as const

export type PhaseExecutionStatus = (typeof PhaseExecutionStatus)[keyof typeof PhaseExecutionStatus]

export const PhaseRunType = {
  IMPLEMENTATION: 'IMPLEMENTATION',
  REVIEW: 'REVIEW',
  QA: 'QA',
} as const

export type PhaseRunType = (typeof PhaseRunType)[keyof typeof PhaseRunType]

export const PhaseExecutionMetaSchema = z.object({
  status: z.enum([
    PhaseExecutionStatus.IDLE,
    PhaseExecutionStatus.RUNNING,
    PhaseExecutionStatus.AWAITING_USER,
    PhaseExecutionStatus.SUCCEEDED,
    PhaseExecutionStatus.FAILED,
  ]),
  runType: z.enum([PhaseRunType.IMPLEMENTATION, PhaseRunType.REVIEW, PhaseRunType.QA]).optional(),
  branch: z.string().optional(),
  workspacePath: z.string().optional(),
  pullRequestUrl: z.string().url().optional(),
  pullRequestNumber: z.number().int().optional(),
  planArtifactId: z.string().uuid().optional(),
  reviewArtifactId: z.string().uuid().optional(),
  lastError: z.string().optional(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  updatedAt: z.string(),
})

export type PhaseExecutionMeta = z.infer<typeof PhaseExecutionMetaSchema>

export const WorkflowPhaseRunJobSchema = z.object({
  organizationId: z.string().uuid(),
  workflowId: z.string().uuid(),
  phaseId: z.string().uuid(),
  phaseKey: z.string(),
  runType: z.enum([PhaseRunType.IMPLEMENTATION, PhaseRunType.REVIEW, PhaseRunType.QA]),
})

export type WorkflowPhaseRunJob = z.infer<typeof WorkflowPhaseRunJobSchema>
