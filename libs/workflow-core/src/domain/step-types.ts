import { z } from 'zod'

/**
 * Types of workflow steps
 */
export enum StepType {
  AGENT = 'agent',
  TOOL = 'tool',
  APPROVAL = 'approval',
}

/**
 * Status of a step execution
 */
export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * Zod schemas for step types
 */
export const StepTypeSchema = z.nativeEnum(StepType)
export const StepStatusSchema = z.nativeEnum(StepStatus)
