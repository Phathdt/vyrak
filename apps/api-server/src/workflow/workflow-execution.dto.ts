import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Start Implementation Request - no body needed
export class StartImplementationRequestDto {}

// Start Implementation Response
export const StartImplementationResponseSchema = z.object({
  message: z.string(),
  workflowId: z.string().uuid(),
  phaseId: z.string().uuid(),
  totalTasks: z.number().int().min(0),
})

export class StartImplementationResponseDto extends createZodDto(StartImplementationResponseSchema) {
  @ApiProperty({ example: 'Implementation orchestration started', description: 'Status message' })
  message!: string

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Workflow ID' })
  workflowId!: string

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001', description: 'Phase ID' })
  phaseId!: string

  @ApiProperty({ example: 5, description: 'Total number of sub-tasks' })
  totalTasks!: number
}

// Implementation Status Response
export const SubTaskStatusSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['PENDING', 'READY', 'IN_PROGRESS', 'WAITING_DEPENDENCY', 'COMPLETED', 'FAILED', 'BLOCKED']),
  dependencyType: z.enum(['INDEPENDENT', 'SEQUENTIAL', 'DEPENDENT']),
  executionOrder: z.number().int(),
})

export const ImplementationStatusResponseSchema = z.object({
  workflowId: z.string().uuid(),
  phaseId: z.string().uuid(),
  totalTasks: z.number().int().min(0),
  completedTasks: z.number().int().min(0),
  failedTasks: z.number().int().min(0),
  inProgressTasks: z.number().int().min(0),
  pendingTasks: z.number().int().min(0),
  readyTasks: z.number().int().min(0),
  tasks: z.array(SubTaskStatusSchema),
})

export class SubTaskStatusDto extends createZodDto(SubTaskStatusSchema) {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002', description: 'Task ID' })
  id!: string

  @ApiProperty({ example: 'task-01', description: 'Task key' })
  key!: string

  @ApiProperty({ example: 'Implement user authentication', description: 'Task title' })
  title!: string

  @ApiProperty({
    example: 'Create login and registration endpoints',
    nullable: true,
    description: 'Task description',
  })
  description!: string | null

  @ApiProperty({
    enum: ['PENDING', 'READY', 'IN_PROGRESS', 'WAITING_DEPENDENCY', 'COMPLETED', 'FAILED', 'BLOCKED'],
    example: 'IN_PROGRESS',
    description: 'Task status',
  })
  status!: 'PENDING' | 'READY' | 'IN_PROGRESS' | 'WAITING_DEPENDENCY' | 'COMPLETED' | 'FAILED' | 'BLOCKED'

  @ApiProperty({
    enum: ['INDEPENDENT', 'SEQUENTIAL', 'DEPENDENT'],
    example: 'INDEPENDENT',
    description: 'Dependency type',
  })
  dependencyType!: 'INDEPENDENT' | 'SEQUENTIAL' | 'DEPENDENT'

  @ApiProperty({ example: 1, description: 'Execution order' })
  executionOrder!: number
}

export class ImplementationStatusResponseDto extends createZodDto(ImplementationStatusResponseSchema) {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Workflow ID' })
  workflowId!: string

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001', description: 'Phase ID' })
  phaseId!: string

  @ApiProperty({ example: 5, description: 'Total number of tasks' })
  totalTasks!: number

  @ApiProperty({ example: 2, description: 'Number of completed tasks' })
  completedTasks!: number

  @ApiProperty({ example: 0, description: 'Number of failed tasks' })
  failedTasks!: number

  @ApiProperty({ example: 1, description: 'Number of in-progress tasks' })
  inProgressTasks!: number

  @ApiProperty({ example: 2, description: 'Number of pending tasks' })
  pendingTasks!: number

  @ApiProperty({ example: 0, description: 'Number of ready tasks' })
  readyTasks!: number

  @ApiProperty({ type: [SubTaskStatusDto], description: 'List of all tasks with status' })
  tasks!: SubTaskStatusDto[]
}

// Retry Task Response
export const RetryTaskResponseSchema = z.object({
  message: z.string(),
  taskId: z.string().uuid(),
  status: z.enum(['completed', 'failed']),
  artifactId: z.string().uuid().optional(),
  error: z.string().optional(),
})

export class RetryTaskResponseDto extends createZodDto(RetryTaskResponseSchema) {
  @ApiProperty({ example: 'Task retry initiated', description: 'Status message' })
  message!: string

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002', description: 'Task ID' })
  taskId!: string

  @ApiProperty({ enum: ['completed', 'failed'], example: 'completed', description: 'Execution result status' })
  status!: 'completed' | 'failed'

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174003',
    required: false,
    description: 'Generated artifact ID',
  })
  artifactId?: string

  @ApiProperty({ example: 'Task execution failed: timeout', required: false, description: 'Error message if failed' })
  error?: string
}

// Code Review DTOs

// Start Code Review Response
export const StartCodeReviewResponseSchema = z.object({
  message: z.string(),
  workflowId: z.string().uuid(),
  phaseId: z.string().uuid(),
})

export class StartCodeReviewResponseDto extends createZodDto(StartCodeReviewResponseSchema) {
  @ApiProperty({ example: 'Code review started', description: 'Status message' })
  message!: string

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Workflow ID' })
  workflowId!: string

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001', description: 'Phase ID' })
  phaseId!: string
}

// Code Review Finding
export const CodeReviewFindingSchema = z.object({
  file: z.string(),
  line: z.number().int().optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']),
  category: z.enum(['quality', 'security', 'performance', 'requirements', 'best-practices']),
  message: z.string(),
  suggestion: z.string().optional(),
})

export class CodeReviewFindingDto extends createZodDto(CodeReviewFindingSchema) {
  @ApiProperty({ example: 'src/auth/auth.service.ts', description: 'File path' })
  file!: string

  @ApiProperty({ example: 42, required: false, description: 'Line number' })
  line?: number

  @ApiProperty({
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
    example: 'HIGH',
    description: 'Finding severity',
  })
  severity!: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'

  @ApiProperty({
    enum: ['quality', 'security', 'performance', 'requirements', 'best-practices'],
    example: 'security',
    description: 'Finding category',
  })
  category!: 'quality' | 'security' | 'performance' | 'requirements' | 'best-practices'

  @ApiProperty({ example: 'Missing input validation on user credentials', description: 'Finding message' })
  message!: string

  @ApiProperty({
    example: 'Add Zod schema validation before processing',
    required: false,
    description: 'Suggested fix',
  })
  suggestion?: string
}

// Code Review Summary
export const CodeReviewSummarySchema = z.object({
  totalFindings: z.number().int().min(0),
  criticalCount: z.number().int().min(0),
  highCount: z.number().int().min(0),
  mediumCount: z.number().int().min(0),
  lowCount: z.number().int().min(0),
  infoCount: z.number().int().min(0),
})

export class CodeReviewSummaryDto extends createZodDto(CodeReviewSummarySchema) {
  @ApiProperty({ example: 15, description: 'Total number of findings' })
  totalFindings!: number

  @ApiProperty({ example: 2, description: 'Number of critical issues' })
  criticalCount!: number

  @ApiProperty({ example: 3, description: 'Number of high priority issues' })
  highCount!: number

  @ApiProperty({ example: 5, description: 'Number of medium priority issues' })
  mediumCount!: number

  @ApiProperty({ example: 3, description: 'Number of low priority issues' })
  lowCount!: number

  @ApiProperty({ example: 2, description: 'Number of informational suggestions' })
  infoCount!: number
}

// Code Review Report Response
export const CodeReviewReportResponseSchema = z.object({
  workflowId: z.string().uuid(),
  phaseId: z.string().uuid(),
  reviewedFiles: z.array(z.string()),
  findings: z.array(CodeReviewFindingSchema),
  summary: CodeReviewSummarySchema,
  artifactId: z.string().uuid().optional(),
  completedAt: z.string().datetime().nullable(),
})

export class CodeReviewReportResponseDto extends createZodDto(CodeReviewReportResponseSchema) {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Workflow ID' })
  workflowId!: string

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001', description: 'Phase ID' })
  phaseId!: string

  @ApiProperty({
    type: [String],
    example: ['src/auth/auth.service.ts', 'src/users/users.repository.ts'],
    description: 'List of reviewed files',
  })
  reviewedFiles!: string[]

  @ApiProperty({ type: [CodeReviewFindingDto], description: 'List of findings' })
  findings!: CodeReviewFindingDto[]

  @ApiProperty({ type: CodeReviewSummaryDto, description: 'Summary statistics' })
  summary!: CodeReviewSummaryDto

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174003',
    required: false,
    description: 'Code review report artifact ID',
  })
  artifactId?: string

  @ApiProperty({ example: '2026-11-02T10:30:00Z', description: 'Review completion timestamp' })
  completedAt!: Date
}

// Start QA Request - no body needed
export class StartQARequestDto {}

// QA Verification Response
export const CriterionResultSchema = z.object({
  criterion: z.string(),
  status: z.enum(['pass', 'fail', 'skipped']),
  details: z.string().optional(),
  errorMessage: z.string().optional(),
})

export const QAVerificationResponseSchema = z.object({
  workflowId: z.string().uuid(),
  phaseId: z.string().uuid(),
  reportArtifactId: z.string().uuid().optional(),
  criteriaResults: z.array(CriterionResultSchema),
  overallStatus: z.enum(['passed', 'failed', 'partial']),
  executedAt: z.string().datetime(),
})

export class CriterionResultDto extends createZodDto(CriterionResultSchema) {
  @ApiProperty({ example: 'User authentication works correctly', description: 'Acceptance criterion' })
  criterion!: string

  @ApiProperty({ enum: ['pass', 'fail', 'skipped'], example: 'pass', description: 'Verification status' })
  status!: 'pass' | 'fail' | 'skipped'

  @ApiProperty({
    example: 'Login and registration endpoints tested successfully',
    required: false,
    description: 'Verification details',
  })
  details?: string

  @ApiProperty({
    example: 'Login endpoint returns 401 instead of 400',
    required: false,
    description: 'Error message if failed',
  })
  errorMessage?: string
}

export class QAVerificationResponseDto extends createZodDto(QAVerificationResponseSchema) {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Workflow ID' })
  workflowId!: string

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001', description: 'Phase ID' })
  phaseId!: string

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174003',
    required: false,
    description: 'QA report artifact ID',
  })
  reportArtifactId?: string

  @ApiProperty({ type: [CriterionResultDto], description: 'List of acceptance criteria results' })
  criteriaResults!: CriterionResultDto[]

  @ApiProperty({
    enum: ['passed', 'failed', 'partial'],
    example: 'passed',
    description: 'Overall QA verification status',
  })
  overallStatus!: 'passed' | 'failed' | 'partial'

  @ApiProperty({ example: '2026-11-02T10:30:00Z', description: 'QA execution timestamp' })
  executedAt!: string
}
