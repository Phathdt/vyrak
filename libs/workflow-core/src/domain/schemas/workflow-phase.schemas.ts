import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { WorkflowPhaseStatus } from '../entities/workflow-phase.entity'

export const WorkflowPhaseResponseSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  sequence: z.number().int(),
  status: z.enum([
    WorkflowPhaseStatus.PENDING,
    WorkflowPhaseStatus.IN_PROGRESS,
    WorkflowPhaseStatus.WAITING_APPROVAL,
    WorkflowPhaseStatus.COMPLETED,
    WorkflowPhaseStatus.FAILED,
    WorkflowPhaseStatus.SKIPPED,
  ]),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  execution: z
    .object({
      status: z.string(),
      runType: z.string().optional(),
      branch: z.string().optional(),
      workspacePath: z.string().optional(),
      pullRequestUrl: z.string().optional(),
      pullRequestNumber: z.number().optional(),
      lastError: z.string().optional(),
      updatedAt: z.string().optional(),
    })
    .nullable()
    .optional(),
  reviewSummary: z.string().optional(),
  commitSha: z.string().optional(),
})

export class WorkflowPhaseResponseDto extends createZodDto(WorkflowPhaseResponseSchema) {
  @ApiProperty()
  id: string

  @ApiProperty()
  workflowId: string

  @ApiProperty({ example: 'planning' })
  key: string

  @ApiProperty({ example: 'Planning' })
  name: string

  @ApiProperty({ example: 1 })
  sequence: number

  @ApiProperty({ enum: Object.values(WorkflowPhaseStatus) })
  status: WorkflowPhaseStatus

  @ApiProperty({ type: String, nullable: true })
  startedAt: string | null

  @ApiProperty({ type: String, nullable: true })
  completedAt: string | null

  @ApiProperty({ required: false, nullable: true })
  execution?: {
    status: string
    runType?: string
    branch?: string
    workspacePath?: string
    pullRequestUrl?: string
    pullRequestNumber?: number
    lastError?: string
    updatedAt?: string
  } | null

  @ApiProperty({ required: false })
  reviewSummary?: string

  @ApiProperty({ required: false })
  commitSha?: string
}

export class WorkflowPhaseListResponseDto {
  @ApiProperty({ type: [WorkflowPhaseResponseDto] })
  items: WorkflowPhaseResponseDto[]
}

export const AdvanceWorkflowPhaseResponseSchema = z.object({
  previousPhaseKey: z.string(),
  currentPhaseKey: z.string().nullable(),
  workflowCompleted: z.boolean(),
  phases: z.array(WorkflowPhaseResponseSchema),
})

export class AdvanceWorkflowPhaseResponseDto extends createZodDto(AdvanceWorkflowPhaseResponseSchema) {
  @ApiProperty({ example: 'planning' })
  previousPhaseKey: string

  @ApiProperty({ type: String, nullable: true, example: 'implementation' })
  currentPhaseKey: string | null

  @ApiProperty()
  workflowCompleted: boolean

  @ApiProperty({ type: [WorkflowPhaseResponseDto] })
  phases: WorkflowPhaseResponseDto[]
}

export const ApproveWorkflowPhaseSchema = z.object({
  note: z.string().max(4000).optional(),
})

export class ApproveWorkflowPhaseDto extends createZodDto(ApproveWorkflowPhaseSchema) {
  @ApiProperty({ required: false, description: 'Optional note stored on the phase approval record' })
  note?: string
}

export const SendBackPhaseSchema = z.object({
  targetPhaseKey: z.string().min(1),
  reason: z.string().max(4000).optional(),
})

export class SendBackPhaseDto extends createZodDto(SendBackPhaseSchema) {
  @ApiProperty({ example: 'implementation' })
  targetPhaseKey: string

  @ApiProperty({ required: false })
  reason?: string
}
