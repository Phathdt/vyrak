import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Create Project
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
})

export class CreateProjectDto extends createZodDto(CreateProjectSchema) {
  @ApiProperty({
    example: 'My Project',
    description: 'Project name',
    minLength: 1,
    maxLength: 255,
  })
  name: string

  @ApiProperty({
    example: 'my-project',
    description: 'Unique project slug within organization (lowercase, alphanumeric, hyphens only)',
    pattern: '^[a-z0-9-]+$',
    minLength: 1,
    maxLength: 100,
  })
  slug: string

  @ApiProperty({
    example: 'This is my project description',
    description: 'Project description',
    required: false,
    maxLength: 500,
  })
  description?: string
}

// Update Project
export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional().nullable(),
})

export class UpdateProjectDto extends createZodDto(UpdateProjectSchema) {
  @ApiProperty({
    example: 'Updated Project Name',
    description: 'Project name',
    required: false,
    minLength: 1,
    maxLength: 255,
  })
  name?: string

  @ApiProperty({
    example: 'Updated project description',
    description: 'Project description',
    required: false,
    maxLength: 500,
    nullable: true,
  })
  description?: string | null
}

// List Projects Query
export const ListProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sort: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export class ListProjectsQueryDto extends createZodDto(ListProjectsQuerySchema) {
  @ApiProperty({
    example: 1,
    description: 'Page number',
    required: false,
    default: 1,
    minimum: 1,
  })
  page: number

  @ApiProperty({
    example: 10,
    description: 'Items per page',
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  limit: number

  @ApiProperty({
    example: 'my project',
    description: 'Search by name or slug',
    required: false,
  })
  search?: string

  @ApiProperty({
    example: 'createdAt',
    description: 'Sort field',
    enum: ['name', 'createdAt', 'updatedAt'],
    required: false,
    default: 'createdAt',
  })
  sort: 'name' | 'createdAt' | 'updatedAt'

  @ApiProperty({
    example: 'desc',
    description: 'Sort order',
    enum: ['asc', 'desc'],
    required: false,
    default: 'desc',
  })
  order: 'asc' | 'desc'
}

// Project Stats
export class ProjectStats {
  @ApiProperty({ example: 5, description: 'Number of repositories' })
  repositoryCount: number

  @ApiProperty({ example: 12, description: 'Number of workflow runs' })
  workflowRunCount: number
}

// Project Response
export class ProjectResponse {
  @ApiProperty({ example: 'uuid-here', description: 'Project ID' })
  id: string

  @ApiProperty({ example: 'uuid-org', description: 'Organization ID' })
  organizationId: string

  @ApiProperty({ example: 'My Project', description: 'Project name' })
  name: string

  @ApiProperty({ example: 'my-project', description: 'Project slug' })
  slug: string

  @ApiProperty({
    type: String,
    example: 'Project description',
    description: 'Project description',
    nullable: true,
    required: false,
  })
  description: string | null

  @ApiProperty({ type: ProjectStats, description: 'Project statistics' })
  stats: ProjectStats

  @ApiProperty({ example: '2024-10-24T10:00:00Z', description: 'Creation timestamp' })
  createdAt: string

  @ApiProperty({ example: '2024-10-24T10:00:00Z', description: 'Last update timestamp' })
  updatedAt: string
}

// Paginated Projects Response
export class PaginatedProjectsResponse {
  @ApiProperty({ type: [ProjectResponse], description: 'List of projects' })
  items: ProjectResponse[]

  @ApiProperty({ example: 100, description: 'Total number of projects' })
  total: number

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number

  @ApiProperty({ example: 10, description: 'Total number of pages' })
  totalPages: number
}

// Internal service types
export interface ProjectWithStats {
  id: string
  organizationId: string
  name: string
  slug: string
  description: string | null
  stats: {
    repositoryCount: number
    workflowRunCount: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface PaginatedProjects {
  items: ProjectWithStats[]
  total: number
  page: number
  limit: number
  totalPages: number
}
