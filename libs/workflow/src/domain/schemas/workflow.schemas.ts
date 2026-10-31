import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { WorkflowStatus, WorkflowType } from '../entities'

// Create Workflow
export const CreateWorkflowSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  repositoryIds: z.array(z.string()).min(1),
})

export class CreateWorkflowDto extends createZodDto(CreateWorkflowSchema) {}

// Update Workflow
export const UpdateWorkflowSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
})

export class UpdateWorkflowDto extends createZodDto(UpdateWorkflowSchema) {}

// List Workflows Query
export const ListWorkflowsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  type: z.enum([WorkflowType.HOTFIX, WorkflowType.STORY, WorkflowType.EPIC]).optional(),
  status: z
    .enum([
      WorkflowStatus.DRAFT,
      WorkflowStatus.BRAINSTORMING,
      WorkflowStatus.CLASSIFICATION_PENDING,
      WorkflowStatus.ACTIVE,
      WorkflowStatus.WAITING_APPROVAL,
      WorkflowStatus.COMPLETED,
      WorkflowStatus.FAILED,
      WorkflowStatus.CANCELLED,
    ])
    .optional(),
  createdById: z.string().optional(),
  sort: z.enum(['title', 'createdAt', 'updatedAt', 'startedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export class ListWorkflowsQueryDto extends createZodDto(ListWorkflowsQuerySchema) {}

// Workflow Classification Request
export const ClassifyWorkflowSchema = z.object({
  force: z.boolean().optional().default(false),
})

export class ClassifyWorkflowDto extends createZodDto(ClassifyWorkflowSchema) {}

// Confirm Classification
export const ConfirmClassificationSchema = z.object({
  type: z.enum([WorkflowType.HOTFIX, WorkflowType.STORY, WorkflowType.EPIC]),
})

export class ConfirmClassificationDto extends createZodDto(ConfirmClassificationSchema) {}

// Workflow Response
export class WorkflowResponse {
  @ApiProperty({ example: 'uuid-here', description: 'Workflow ID' })
  id: string

  @ApiProperty({ example: 'uuid-org', description: 'Organization ID' })
  organizationId: string

  @ApiProperty({ example: 'uuid-project', description: 'Project ID' })
  projectId: string

  @ApiProperty({
    type: String,
    example: WorkflowType.STORY,
    description: 'Workflow type',
    enum: Object.values(WorkflowType),
    nullable: true,
  })
  type: WorkflowType | null

  @ApiProperty({
    example: WorkflowStatus.ACTIVE,
    description: 'Workflow status',
    enum: Object.values(WorkflowStatus),
  })
  status:
    | WorkflowStatus
    | 'CLASSIFICATION_PENDING'
    | 'ACTIVE'
    | 'WAITING_APPROVAL'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED'

  @ApiProperty({
    example: 'Implement user authentication',
    description: 'Workflow title',
  })
  title: string

  @ApiProperty({
    type: String,
    example: 'Add JWT-based authentication',
    description: 'Workflow description',
    nullable: true,
  })
  description: string | null

  @ApiProperty({
    type: String,
    example: 'planning',
    description: 'Current phase key',
    nullable: true,
  })
  currentPhaseKey: string | null

  @ApiProperty({
    type: Object,
    example: null,
    description: 'Workflow definition snapshot',
    nullable: true,
  })
  definitionSnapshot: Record<string, unknown> | null

  @ApiProperty({
    type: Object,
    example: null,
    description: 'AI classification result',
    nullable: true,
  })
  classification: Record<string, unknown> | null

  @ApiProperty({
    type: String,
    example: '2024-10-31T00:00:00Z',
    description: 'Classification confirmation timestamp',
    nullable: true,
  })
  classificationConfirmedAt: string | null

  @ApiProperty({
    type: String,
    example: 'user-uuid',
    description: 'User who confirmed classification',
    nullable: true,
  })
  classificationConfirmedById: string | null

  @ApiProperty({ example: 'user-uuid', description: 'Creator user ID' })
  createdById: string

  @ApiProperty({
    type: String,
    example: '2024-10-31T00:00:00Z',
    description: 'Workflow start timestamp',
    nullable: true,
  })
  startedAt: string | null

  @ApiProperty({
    type: String,
    example: '2024-10-31T10:00:00Z',
    description: 'Workflow completion timestamp',
    nullable: true,
  })
  completedAt: string | null

  @ApiProperty({
    example: '2024-10-31T00:00:00Z',
    description: 'Creation timestamp',
  })
  createdAt: string

  @ApiProperty({
    example: '2024-10-31T00:00:00Z',
    description: 'Last update timestamp',
  })
  updatedAt: string

  @ApiProperty({
    type: Array,
    example: [{ id: 'repo-link-uuid', repositoryId: 'repo-uuid' }],
    description: 'Associated repositories',
  })
  repositories: Array<{
    id: string
    repositoryId: string
  }>
}

// Paginated Workflows Response
export class PaginatedWorkflowsResponse {
  @ApiProperty({ type: [WorkflowResponse], description: 'List of workflows' })
  items: WorkflowResponse[]

  @ApiProperty({ example: 100, description: 'Total number of workflows' })
  total: number

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number

  @ApiProperty({ example: 10, description: 'Total number of pages' })
  totalPages: number
}

// Internal service types
export interface WorkflowWithRepositories {
  id: string
  organizationId: string
  projectId: string
  type: WorkflowType | null
  status: WorkflowStatus
  title: string
  description: string | null
  currentPhaseKey: string | null
  definitionSnapshot: Record<string, unknown> | null
  classification: Record<string, unknown> | null
  classificationConfirmedAt: Date | null
  classificationConfirmedById: string | null
  createdById: string
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  repositories: Array<{
    id: string
    repositoryId: string
  }>
}

export interface PaginatedWorkflows {
  items: WorkflowWithRepositories[]
  total: number
  page: number
  limit: number
  totalPages: number
}
