import { z } from 'zod'

/**
 * Schema for approving a workflow
 * - comment: optional, max 500 characters
 * - confirmed: required checkbox (user must explicitly confirm)
 */
export const approveWorkflowSchema = z.object({
  comment: z.string().max(500, 'Comment must be 500 characters or less').optional().or(z.literal('')), // Treat empty string as undefined
  confirmed: z.boolean().refine((val) => val === true, 'You must confirm to approve'),
})

export type ApproveWorkflowFormData = z.infer<typeof approveWorkflowSchema>

/**
 * Schema for rejecting a workflow
 * - reason: required, min 10 chars, max 1000 chars
 * - confirmed: required checkbox (user must understand rejection is terminal)
 */
export const rejectWorkflowSchema = z.object({
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000, 'Reason must be 1000 characters or less'),
  confirmed: z.boolean().refine((val) => val === true, 'You must confirm to reject'),
})

export type RejectWorkflowFormData = z.infer<typeof rejectWorkflowSchema>

/**
 * Transform form data to API DTO
 * Empty comment becomes undefined (API expects optional field)
 */
export function toApprovalDecisionDto(data: ApproveWorkflowFormData): { comment?: string } {
  return {
    comment: data.comment?.trim() || undefined,
  }
}

/**
 * Transform reject form data to API DTO
 * Reason is always required
 */
export function toRejectDecisionDto(data: RejectWorkflowFormData): { comment: string } {
  return {
    comment: data.reason.trim(), // API uses 'comment' field for rejection reason
  }
}
