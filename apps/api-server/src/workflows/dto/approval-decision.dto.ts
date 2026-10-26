import { ApiProperty } from '@nestjs/swagger'

import { createZodDto } from 'nestjs-zod'
import { z } from 'nestjs-zod/z'

/**
 * Zod schema for approval decision (approve/reject)
 */
export const ApprovalDecisionSchema = z.object({
  comment: z.string().max(5000, 'Comment must not exceed 5000 characters').optional(),
})

/**
 * DTO for approval decision
 * Used by POST /api/workflows/runs/:runId/approve and POST /api/workflows/runs/:runId/reject
 *
 * Note: Comment is optional for approval but required for rejection (enforced at controller level)
 */
export class ApprovalDecisionDto extends createZodDto(ApprovalDecisionSchema) {
  @ApiProperty({
    description: 'Optional comment for approval decision. Required when rejecting.',
    example: 'Approved after reviewing the implementation plan',
    maxLength: 5000,
    required: false,
  })
  comment?: string
}
