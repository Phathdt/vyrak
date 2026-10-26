import { ApiProperty } from '@nestjs/swagger'

import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

/**
 * Zod schema for metrics summary
 */
export const MetricsSummarySchema = z.object({
  totalRuns: z.number().int().min(0),
  succeeded: z.number().int().min(0),
  failed: z.number().int().min(0),
  cancelled: z.number().int().min(0),
  running: z.number().int().min(0),
  successRate: z.number().min(0).max(1),
  avgDurationSeconds: z.number().nullable(),
  p50DurationSeconds: z.number().nullable(),
  p95DurationSeconds: z.number().nullable(),
  p99DurationSeconds: z.number().nullable(),
})

/**
 * DTO for metrics summary statistics
 */
export class MetricsSummaryDto extends createZodDto(MetricsSummarySchema) {
  @ApiProperty({ description: 'Total number of workflow runs', example: 1234 })
  totalRuns: number

  @ApiProperty({ description: 'Number of succeeded runs', example: 1100 })
  succeeded: number

  @ApiProperty({ description: 'Number of failed runs', example: 89 })
  failed: number

  @ApiProperty({ description: 'Number of cancelled runs', example: 30 })
  cancelled: number

  @ApiProperty({ description: 'Number of running runs', example: 15 })
  running: number

  @ApiProperty({ description: 'Success rate (succeeded / completed)', example: 0.891 })
  successRate: number

  @ApiProperty({ description: 'Average duration in seconds', example: 245.6, nullable: true })
  avgDurationSeconds: number | null

  @ApiProperty({ description: 'P50 duration in seconds', example: 180, nullable: true })
  p50DurationSeconds: number | null

  @ApiProperty({ description: 'P95 duration in seconds', example: 450, nullable: true })
  p95DurationSeconds: number | null

  @ApiProperty({ description: 'P99 duration in seconds', example: 680, nullable: true })
  p99DurationSeconds: number | null
}

/**
 * Zod schema for time series data point
 */
export const TimeSeriesDataPointSchema = z.object({
  timestamp: z.string().datetime(),
  totalRuns: z.number().int().min(0),
  succeeded: z.number().int().min(0),
  failed: z.number().int().min(0),
  cancelled: z.number().int().min(0),
  avgDurationSeconds: z.number().nullable(),
})

/**
 * DTO for time series data point
 */
export class TimeSeriesDataPointDto extends createZodDto(TimeSeriesDataPointSchema) {
  @ApiProperty({ description: 'Timestamp for this data point', example: '2026-10-19T00:00:00.000Z' })
  timestamp: string

  @ApiProperty({ description: 'Total runs in this period', example: 145 })
  totalRuns: number

  @ApiProperty({ description: 'Succeeded runs in this period', example: 130 })
  succeeded: number

  @ApiProperty({ description: 'Failed runs in this period', example: 10 })
  failed: number

  @ApiProperty({ description: 'Cancelled runs in this period', example: 5 })
  cancelled: number

  @ApiProperty({ description: 'Average duration in seconds for this period', example: 230.5, nullable: true })
  avgDurationSeconds: number | null
}

/**
 * Zod schema for workflow breakdown
 */
export const WorkflowBreakdownSchema = z.object({
  workflowKey: z.string(),
  totalRuns: z.number().int().min(0),
  succeeded: z.number().int().min(0),
  failed: z.number().int().min(0),
  successRate: z.number().min(0).max(1),
  avgDurationSeconds: z.number().nullable(),
})

/**
 * DTO for workflow breakdown statistics
 */
export class WorkflowBreakdownDto extends createZodDto(WorkflowBreakdownSchema) {
  @ApiProperty({ description: 'Workflow key', example: 'ai-sdlc-workflow' })
  workflowKey: string

  @ApiProperty({ description: 'Total runs for this workflow', example: 800 })
  totalRuns: number

  @ApiProperty({ description: 'Succeeded runs for this workflow', example: 750 })
  succeeded: number

  @ApiProperty({ description: 'Failed runs for this workflow', example: 40 })
  failed: number

  @ApiProperty({ description: 'Success rate for this workflow', example: 0.937 })
  successRate: number

  @ApiProperty({ description: 'Average duration in seconds for this workflow', example: 280.3, nullable: true })
  avgDurationSeconds: number | null
}

/**
 * Zod schema for workflow metrics response
 */
export const WorkflowMetricsResponseSchema = z.object({
  organizationId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  period: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
  summary: MetricsSummarySchema,
  timeSeries: z.array(TimeSeriesDataPointSchema),
  byWorkflow: z.array(WorkflowBreakdownSchema),
})

/**
 * DTO for workflow metrics response
 */
export class WorkflowMetricsResponseDto extends createZodDto(WorkflowMetricsResponseSchema) {
  @ApiProperty({ description: 'Organization ID', example: 'org-123' })
  organizationId: string

  @ApiProperty({ description: 'Project ID (null if all projects)', example: 'proj-456', nullable: true })
  projectId: string | null

  @ApiProperty({
    description: 'Time period for metrics',
    example: { from: '2026-10-19T00:00:00.000Z', to: '2026-10-26T10:51:00.000Z' },
  })
  period: {
    from: string
    to: string
  }

  @ApiProperty({ description: 'Summary statistics', type: MetricsSummaryDto })
  summary: MetricsSummaryDto

  @ApiProperty({ description: 'Time series data', type: [TimeSeriesDataPointDto] })
  timeSeries: TimeSeriesDataPointDto[]

  @ApiProperty({ description: 'Breakdown by workflow', type: [WorkflowBreakdownDto] })
  byWorkflow: WorkflowBreakdownDto[]
}
