import { z } from 'zod'

/**
 * Workflow creation form validation schema
 * Matches backend CreateWorkflowRunDto expectations
 */
export const createWorkflowSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),

  repositoryId: z.string().uuid('Invalid repository ID'),

  branch: z
    .string()
    .min(1, 'Branch is required')
    .max(100, 'Branch name too long')
    .regex(/^[a-zA-Z0-9/_-]+$/, 'Invalid branch name format'),

  requirement: z
    .string()
    .min(20, 'Requirement must be at least 20 characters')
    .max(5000, 'Requirement must not exceed 5000 characters')
    .trim(),

  idempotencyKey: z.string().uuid('Invalid idempotency key format').optional(),
})

export type CreateWorkflowFormData = z.infer<typeof createWorkflowSchema>

/**
 * Draft state saved to localStorage (subset of form data)
 */
export const workflowDraftSchema = z.object({
  projectId: z.string().uuid().optional(),
  repositoryId: z.string().uuid().optional(),
  branch: z.string().optional(),
  requirement: z.string().optional(),
  savedAt: z.string().datetime(),
})

export type WorkflowDraft = z.infer<typeof workflowDraftSchema>
