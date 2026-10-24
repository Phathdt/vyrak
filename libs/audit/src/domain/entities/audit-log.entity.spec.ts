import { describe, expect, it } from 'vitest'

import { AuditLogSchema, CreateAuditLogSchema } from './audit-log.entity'

describe('AuditLogSchema', () => {
  const validAuditLogData = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    organizationId: '550e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440002',
    event: 'auth.login',
    action: 'create' as const,
    resource: 'session',
    resourceId: '550e8400-e29b-41d4-a716-446655440003',
    metadata: { ip: '127.0.0.1', sessionId: 'sess-123' },
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
  }

  describe('valid audit log', () => {
    it('should validate complete audit log with all fields', () => {
      const result = AuditLogSchema.safeParse(validAuditLogData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validAuditLogData)
      }
    })

    it('should validate audit log with only required fields', () => {
      const minimalData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        organizationId: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440002',
        event: 'auth.login',
        action: 'create' as const,
        resource: 'session',
        createdAt: new Date(),
      }
      const result = AuditLogSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(minimalData.id)
        expect(result.data.organizationId).toBe(minimalData.organizationId)
        expect(result.data.userId).toBe(minimalData.userId)
      }
    })

    it('should accept all valid action types', () => {
      const actions = ['create', 'update', 'delete', 'read'] as const

      actions.forEach((action) => {
        const data = { ...validAuditLogData, action }
        const result = AuditLogSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('required fields validation', () => {
    it('should reject missing id', () => {
      const { id, ...data } = validAuditLogData
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing organizationId', () => {
      const { organizationId, ...data } = validAuditLogData
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing userId', () => {
      const { userId, ...data } = validAuditLogData
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing event', () => {
      const { event, ...data } = validAuditLogData
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing action', () => {
      const { action, ...data } = validAuditLogData
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing resource', () => {
      const { resource, ...data } = validAuditLogData
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing createdAt', () => {
      const { createdAt, ...data } = validAuditLogData
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('optional fields validation', () => {
    it('should accept audit log without resourceId', () => {
      const { resourceId, ...data } = validAuditLogData
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept audit log without metadata', () => {
      const { metadata, ...data } = validAuditLogData
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept audit log without ipAddress', () => {
      const { ipAddress, ...data } = validAuditLogData
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept audit log without userAgent', () => {
      const { userAgent, ...data } = validAuditLogData
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow null metadata', () => {
      const data = { ...validAuditLogData, metadata: undefined }
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('field type validation', () => {
    it('should reject invalid id (non-uuid)', () => {
      const data = { ...validAuditLogData, id: 'not-a-uuid' }
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject invalid organizationId (non-uuid)', () => {
      const data = { ...validAuditLogData, organizationId: 'invalid-id' }
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject invalid userId (non-uuid)', () => {
      const data = { ...validAuditLogData, userId: 'not-uuid' }
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject invalid resourceId (non-uuid)', () => {
      const data = { ...validAuditLogData, resourceId: 'invalid-uuid' }
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject invalid action value', () => {
      const data = { ...validAuditLogData, action: 'invalid_action' }
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject non-date createdAt', () => {
      const data = { ...validAuditLogData, createdAt: '2024-01-01' }
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept Date object for createdAt', () => {
      const date = new Date()
      const data = { ...validAuditLogData, createdAt: date }
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.createdAt).toEqual(date)
      }
    })

    it('should accept record type for metadata', () => {
      const metadata = { key1: 'value1', key2: 123, nested: { data: true } }
      const data = { ...validAuditLogData, metadata }
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.metadata).toEqual(metadata)
      }
    })

    it('should accept strings for event and resource', () => {
      const data = {
        ...validAuditLogData,
        event: 'user.profile.updated',
        resource: 'profile',
      }
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('CreateAuditLogSchema', () => {
    const validCreateData = {
      organizationId: '550e8400-e29b-41d4-a716-446655440001',
      userId: '550e8400-e29b-41d4-a716-446655440002',
      event: 'auth.login',
      action: 'create' as const,
      resource: 'session',
      resourceId: '550e8400-e29b-41d4-a716-446655440003',
      metadata: { ip: '127.0.0.1' },
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    }

    it('should validate complete create audit log data', () => {
      const result = CreateAuditLogSchema.safeParse(validCreateData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.organizationId).toBe(validCreateData.organizationId)
        expect(result.data.event).toBe(validCreateData.event)
      }
    })

    it('should omit id field when provided (Zod omit behavior)', () => {
      const data = { ...validCreateData, id: '550e8400-e29b-41d4-a716-446655440000' }
      const result = CreateAuditLogSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('id')
      }
    })

    it('should omit createdAt field when provided (Zod omit behavior)', () => {
      const data = { ...validCreateData, createdAt: new Date() }
      const result = CreateAuditLogSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('createdAt')
      }
    })

    it('should validate minimal create data without optional fields', () => {
      const minimalData = {
        organizationId: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440002',
        event: 'test.event',
        action: 'read' as const,
        resource: 'resource',
      }
      const result = CreateAuditLogSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
    })

    it('should reject missing organizationId', () => {
      const { organizationId, ...data } = validCreateData
      const result = CreateAuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing userId', () => {
      const { userId, ...data } = validCreateData
      const result = CreateAuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing event', () => {
      const { event, ...data } = validCreateData
      const result = CreateAuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing action', () => {
      const { action, ...data } = validCreateData
      const result = CreateAuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing resource', () => {
      const { resource, ...data } = validCreateData
      const result = CreateAuditLogSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle empty metadata object', () => {
      const data = { ...validAuditLogData, metadata: {} }
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle empty strings for event and resource', () => {
      const data = { ...validAuditLogData, event: '', resource: '' }
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000)
      const data = { ...validAuditLogData, event: longString, userAgent: longString }
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle complex nested metadata', () => {
      const complexMetadata = {
        level1: {
          level2: {
            level3: {
              arrays: [1, 2, 3],
              strings: ['a', 'b', 'c'],
              mixed: [1, 'two', { three: 3 }],
            },
          },
        },
      }
      const data = { ...validAuditLogData, metadata: complexMetadata }
      const result = AuditLogSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle past and future dates', () => {
      const pastDate = new Date('2000-01-01')
      const futureDate = new Date('2100-12-31')

      const pastResult = AuditLogSchema.safeParse({ ...validAuditLogData, createdAt: pastDate })
      const futureResult = AuditLogSchema.safeParse({ ...validAuditLogData, createdAt: futureDate })

      expect(pastResult.success).toBe(true)
      expect(futureResult.success).toBe(true)
    })
  })
})
