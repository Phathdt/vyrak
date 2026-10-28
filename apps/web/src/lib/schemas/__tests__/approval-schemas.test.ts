import { describe, expect, it } from 'vitest'

import {
  approveWorkflowSchema,
  rejectWorkflowSchema,
  toApprovalDecisionDto,
  toRejectDecisionDto,
} from '../approval-schemas'

describe('approveWorkflowSchema', () => {
  it('accepts valid approval with comment', () => {
    const result = approveWorkflowSchema.safeParse({
      comment: 'Looks good',
      confirmed: true,
    })
    expect(result.success).toBe(true)
    expect(result.data?.comment).toBe('Looks good')
  })

  it('accepts approval without comment', () => {
    const result = approveWorkflowSchema.safeParse({
      comment: '',
      confirmed: true,
    })
    expect(result.success).toBe(true)
  })

  it('accepts approval with comment at max length (500)', () => {
    const maxComment = 'a'.repeat(500)
    const result = approveWorkflowSchema.safeParse({
      comment: maxComment,
      confirmed: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects approval without confirmation', () => {
    const result = approveWorkflowSchema.safeParse({
      comment: 'Test',
      confirmed: false,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
      expect(result.error.issues[0].message).toContain('must confirm')
    }
  })

  it('rejects comment over 500 characters', () => {
    const result = approveWorkflowSchema.safeParse({
      comment: 'a'.repeat(501),
      confirmed: true,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
      expect(result.error.issues[0].message).toContain('500 characters')
    }
  })

  it('treats empty string as valid', () => {
    const result = approveWorkflowSchema.safeParse({
      comment: '',
      confirmed: true,
    })
    expect(result.success).toBe(true)
  })

  it('requires confirmation to be explicitly true', () => {
    const result = approveWorkflowSchema.safeParse({
      comment: 'OK',
      confirmed: undefined,
    })
    expect(result.success).toBe(false)
  })
})

describe('toApprovalDecisionDto', () => {
  it('transforms empty comment to undefined', () => {
    const data = { comment: '', confirmed: true }
    const dto = toApprovalDecisionDto(data)
    expect(dto.comment).toBeUndefined()
  })

  it('trims whitespace from comment', () => {
    const data = { comment: '  Test comment  ', confirmed: true }
    const dto = toApprovalDecisionDto(data)
    expect(dto.comment).toBe('Test comment')
  })

  it('preserves non-empty comment', () => {
    const data = { comment: 'Approved', confirmed: true }
    const dto = toApprovalDecisionDto(data)
    expect(dto.comment).toBe('Approved')
  })

  it('handles whitespace-only comment as undefined', () => {
    const data = { comment: '   ', confirmed: true }
    const dto = toApprovalDecisionDto(data)
    expect(dto.comment).toBeUndefined()
  })

  it('returns object with only comment field', () => {
    const data = { comment: 'Test', confirmed: true }
    const dto = toApprovalDecisionDto(data)
    expect(Object.keys(dto)).toEqual(['comment'])
  })
})

describe('rejectWorkflowSchema', () => {
  it('accepts valid rejection with reason', () => {
    const result = rejectWorkflowSchema.safeParse({
      reason: 'This plan is incorrect',
      confirmed: true,
    })
    expect(result.success).toBe(true)
  })

  it('accepts reason at min length (10)', () => {
    const result = rejectWorkflowSchema.safeParse({
      reason: '0123456789',
      confirmed: true,
    })
    expect(result.success).toBe(true)
  })

  it('accepts reason at max length (1000)', () => {
    const maxReason = 'a'.repeat(1000)
    const result = rejectWorkflowSchema.safeParse({
      reason: maxReason,
      confirmed: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects reason under 10 characters', () => {
    const result = rejectWorkflowSchema.safeParse({
      reason: 'Bad',
      confirmed: true,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
      expect(result.error.issues[0].message).toContain('10 characters')
    }
  })

  it('rejects reason over 1000 characters', () => {
    const result = rejectWorkflowSchema.safeParse({
      reason: 'a'.repeat(1001),
      confirmed: true,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
      expect(result.error.issues[0].message).toContain('1000 characters')
    }
  })

  it('rejects without confirmation', () => {
    const result = rejectWorkflowSchema.safeParse({
      reason: 'Valid reason here for sure',
      confirmed: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty reason', () => {
    const result = rejectWorkflowSchema.safeParse({
      reason: '',
      confirmed: true,
    })
    expect(result.success).toBe(false)
  })
})

describe('toRejectDecisionDto', () => {
  it('transforms reason to comment field', () => {
    const data = { reason: 'Test reason', confirmed: true }
    const dto = toRejectDecisionDto(data)
    expect(dto.comment).toBe('Test reason')
  })

  it('trims whitespace from reason', () => {
    const data = { reason: '  Valid reason  ', confirmed: true }
    const dto = toRejectDecisionDto(data)
    expect(dto.comment).toBe('Valid reason')
  })

  it('preserves reason content', () => {
    const data = { reason: 'Plan does not address security requirements', confirmed: true }
    const dto = toRejectDecisionDto(data)
    expect(dto.comment).toBe('Plan does not address security requirements')
  })

  it('returns object with only comment field', () => {
    const data = { reason: 'Valid reason for rejection', confirmed: true }
    const dto = toRejectDecisionDto(data)
    expect(Object.keys(dto)).toEqual(['comment'])
  })
})
