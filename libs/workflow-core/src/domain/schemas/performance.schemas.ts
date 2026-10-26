import { ApiProperty } from '@nestjs/swagger'

import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

/**
 * Error history item for a failed step attempt
 */
const ErrorHistoryItemSchema = z.object({
  attempt: z.number().int().min(1),
  errorMessage: z.string(),
  failedAt: z.string().datetime(),
})

/**
 * Performance data for a single step in a workflow run
 */
export const PerformanceStepSchema = z.object({
  stepKey: z.string(),
  status: z.enum(['pending', 'running', 'succeeded', 'failed', 'skipped']),
  attempt: z.number().int().min(0),
  durationSeconds: z.number().nullable(),
  percentageOfTotal: z.number().nullable(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  isCriticalPath: z.boolean(),
  retries: z.number().int().min(0),
  errorHistory: z.array(ErrorHistoryItemSchema).optional(),
})

export class PerformanceStepDto extends createZodDto(PerformanceStepSchema) {
  @ApiProperty({ example: 'planning', description: 'Step key identifier' })
  stepKey!: string

  @ApiProperty({
    enum: ['pending', 'running', 'succeeded', 'failed', 'skipped'],
    example: 'succeeded',
    description: 'Current status of the step',
  })
  status!: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'

  @ApiProperty({ example: 1, description: 'Latest attempt number' })
  attempt!: number

  @ApiProperty({ example: 45.2, nullable: true, description: 'Duration in seconds' })
  durationSeconds!: number | null

  @ApiProperty({ example: 18.4, nullable: true, description: 'Percentage of total workflow duration' })
  percentageOfTotal!: number | null

  @ApiProperty({ type: String, nullable: true, description: 'ISO timestamp when step started' })
  startedAt!: string | null

  @ApiProperty({ type: String, nullable: true, description: 'ISO timestamp when step completed' })
  completedAt!: string | null

  @ApiProperty({ example: true, description: 'Whether step is on critical path' })
  isCriticalPath!: boolean

  @ApiProperty({ example: 0, description: 'Number of retries' })
  retries!: number

  @ApiProperty({ required: false, description: 'History of failed attempts' })
  errorHistory?: Array<{
    attempt: number
    errorMessage: string
    failedAt: string
  }>
}

/**
 * Performance bottleneck detected in workflow execution
 */
export const PerformanceBottleneckSchema = z.object({
  stepKey: z.string(),
  reason: z.string(),
  durationSeconds: z.number().optional(),
  retryCount: z.number().int().optional(),
  suggestion: z.string(),
})

export class PerformanceBottleneckDto extends createZodDto(PerformanceBottleneckSchema) {
  @ApiProperty({ example: 'implementation', description: 'Step key with bottleneck' })
  stepKey!: string

  @ApiProperty({ example: 'Longest step duration (73.5% of total)', description: 'Reason for bottleneck' })
  reason!: string

  @ApiProperty({ example: 180.5, required: false, description: 'Step duration if relevant' })
  durationSeconds?: number

  @ApiProperty({ example: 1, required: false, description: 'Retry count if relevant' })
  retryCount?: number

  @ApiProperty({
    example: 'Consider breaking into smaller steps or parallelizing',
    description: 'Suggestion to resolve bottleneck',
  })
  suggestion!: string
}

/**
 * Summary statistics for workflow performance
 */
export const PerformanceSummarySchema = z.object({
  totalSteps: z.number().int().min(0),
  completedSteps: z.number().int().min(0),
  failedSteps: z.number().int().min(0),
  averageStepDuration: z.number().nullable(),
  longestStepKey: z.string().nullable(),
  longestStepDuration: z.number().nullable(),
  totalRetries: z.number().int().min(0),
})

export class PerformanceSummaryDto extends createZodDto(PerformanceSummarySchema) {
  @ApiProperty({ example: 5, description: 'Total number of steps' })
  totalSteps!: number

  @ApiProperty({ example: 5, description: 'Number of completed steps' })
  completedSteps!: number

  @ApiProperty({ example: 0, description: 'Number of failed steps' })
  failedSteps!: number

  @ApiProperty({ example: 49.12, nullable: true, description: 'Average duration per step in seconds' })
  averageStepDuration!: number | null

  @ApiProperty({ example: 'implementation', nullable: true, description: 'Key of longest step' })
  longestStepKey!: string | null

  @ApiProperty({ example: 180.5, nullable: true, description: 'Duration of longest step in seconds' })
  longestStepDuration!: number | null

  @ApiProperty({ example: 1, description: 'Total number of retries across all steps' })
  totalRetries!: number
}

/**
 * Complete performance analysis response for a workflow run
 */
export const WorkflowPerformanceResponseSchema = z.object({
  runId: z.string().uuid(),
  organizationId: z.string().uuid(),
  projectId: z.string().uuid(),
  workflowKey: z.string(),
  state: z.string(),
  totalDurationSeconds: z.number().nullable(),
  steps: z.array(PerformanceStepSchema),
  bottlenecks: z.array(PerformanceBottleneckSchema),
  summary: PerformanceSummarySchema,
})

export class WorkflowPerformanceResponseDto extends createZodDto(WorkflowPerformanceResponseSchema) {
  @ApiProperty({ example: 'run-123', description: 'Workflow run ID' })
  runId!: string

  @ApiProperty({ example: 'org-123', description: 'Organization ID' })
  organizationId!: string

  @ApiProperty({ example: 'proj-456', description: 'Project ID' })
  projectId!: string

  @ApiProperty({ example: 'ai-sdlc-workflow', description: 'Workflow key' })
  workflowKey!: string

  @ApiProperty({ example: 'succeeded', description: 'Workflow state' })
  state!: string

  @ApiProperty({ example: 245.6, nullable: true, description: 'Total workflow duration in seconds' })
  totalDurationSeconds!: number | null

  @ApiProperty({ type: [PerformanceStepDto], description: 'Performance data for each step' })
  steps!: PerformanceStepDto[]

  @ApiProperty({ type: [PerformanceBottleneckDto], description: 'Detected performance bottlenecks' })
  bottlenecks!: PerformanceBottleneckDto[]

  @ApiProperty({ type: PerformanceSummaryDto, description: 'Summary statistics' })
  summary!: PerformanceSummaryDto
}
