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
}

export class WorkflowPhaseListResponseDto {
  @ApiProperty({ type: [WorkflowPhaseResponseDto] })
  items: WorkflowPhaseResponseDto[]
}
