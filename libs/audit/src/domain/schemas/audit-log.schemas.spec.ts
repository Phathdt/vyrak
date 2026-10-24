import { describe, expect, it } from 'vitest'

import {
  AuditLogResponseDto,
  AuditLogResponseDtoSchema,
  CreateAuditLogDto,
  CreateAuditLogDtoSchema,
} from './audit-log.schemas'

describe('CreateAuditLogDtoSchema', () => {
  const validDtoData = {
    organizationId: '550e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440002',
    event: 'auth.login',
    action: 'create' as const,
    resource: 'session',
    resourceId: '550e8400-e29b-41d4-a716-446655440003',
    metadata: { ip: '127.0.0.1', sessionId: 'sess-123' },
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
  }

  describe('schema validation', () => {
    it('should validate complete CreateAuditLogDto data', () => {
      const result = CreateAuditLogDtoSchema.safeParse(validDtoData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.organizationId).toBe(validDtoData.organizationId)
        expect(result.data.action).toBe('create')
      }
    })

    it('should validate with minimum required fields', () => {
      const minimalData = {
        organizationId: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440002',
        event: 'auth.login',
        action: 'create' as const,
        resource: 'session',
      }
      const result = CreateAuditLogDtoSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
    })

    it('should reject missing organizationId', () => {
      const { organizationId, ...data } = validDtoData
      const result = CreateAuditLogDtoSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing userId', () => {
      const { userId, ...data } = validDtoData
      const result = CreateAuditLogDtoSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing event', () => {
      const { event, ...data } = validDtoData
      const result = CreateAuditLogDtoSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing action', () => {
      const { action, ...data } = validDtoData
      const result = CreateAuditLogDtoSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject missing resource', () => {
      const { resource, ...data } = validDtoData
      const result = CreateAuditLogDtoSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject invalid organizationId format', () => {
      const data = { ...validDtoData, organizationId: 'not-a-uuid' }
      const result = CreateAuditLogDtoSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject invalid userId format', () => {
      const data = { ...validDtoData, userId: 'invalid-uuid' }
      const result = CreateAuditLogDtoSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject invalid resourceId format when provided', () => {
      const data = { ...validDtoData, resourceId: 'not-uuid' }
      const result = CreateAuditLogDtoSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject invalid action value', () => {
      const data = { ...validDtoData, action: 'invalid_action' }
      const result = CreateAuditLogDtoSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept all valid action values', () => {
      const actions = ['create', 'update', 'delete', 'read'] as const
      actions.forEach((action) => {
        const data = { ...validDtoData, action }
        const result = CreateAuditLogDtoSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('should omit id field when provided (Zod omit behavior)', () => {
      const dataWithId = { ...validDtoData, id: '550e8400-e29b-41d4-a716-446655440000' }
      const result = CreateAuditLogDtoSchema.safeParse(dataWithId)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('id')
      }
    })

    it('should omit createdAt field when provided (Zod omit behavior)', () => {
      const dataWithCreatedAt = { ...validDtoData, createdAt: new Date() }
      const result = CreateAuditLogDtoSchema.safeParse(dataWithCreatedAt)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('createdAt')
      }
    })
  })

  describe('optional fields', () => {
    it('should allow undefined resourceId', () => {
      const data = { ...validDtoData, resourceId: undefined }
      const result = CreateAuditLogDtoSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow undefined metadata', () => {
      const data = { ...validDtoData, metadata: undefined }
      const result = CreateAuditLogDtoSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow undefined ipAddress', () => {
      const data = { ...validDtoData, ipAddress: undefined }
      const result = CreateAuditLogDtoSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow undefined userAgent', () => {
      const data = { ...validDtoData, userAgent: undefined }
      const result = CreateAuditLogDtoSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('DTO class instantiation', () => {
    it('should create instance of CreateAuditLogDto', () => {
      const dto = new CreateAuditLogDto(validDtoData)
      expect(dto).toBeInstanceOf(CreateAuditLogDto)
      // nestjs-zod DTOs don't expose properties directly; they use the schema for validation
      expect(dto).toBeDefined()
    })

    it('should accept instance creation even with invalid data (validation happens at controller level)', () => {
      const invalidData = { ...validDtoData, organizationId: 'not-a-uuid' }
      // createZodDto doesn't throw on instantiation; validation happens via @Body decorator in NestJS
      const dto = new CreateAuditLogDto(invalidData)
      expect(dto).toBeInstanceOf(CreateAuditLogDto)
    })
  })
})

describe('AuditLogResponseDtoSchema', () => {
  const validResponseData = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    organizationId: '550e8400-e29b-41d4-a716-446655440001',
    userId: '550e8400-e29b-41d4-a716-446655440002',
    event: 'auth.login',
    action: 'create' as const,
    resource: 'session',
    resourceId: '550e8400-e29b-41d4-a716-446655440003',
    metadata: { ip: '127.0.0.1' },
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    createdAt: '2024-01-15T10:30:00Z',
  }

  describe('schema validation', () => {
    it('should validate complete AuditLogResponseDto data', () => {
      const result = AuditLogResponseDtoSchema.safeParse(validResponseData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(validResponseData.id)
        expect(result.data.createdAt).toBe(validResponseData.createdAt)
      }
    })

    it('should validate with minimum required fields', () => {
      const minimalData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        organizationId: '550e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440002',
        event: 'auth.login',
        action: 'create' as const,
        resource: 'session',
        createdAt: '2024-01-15T10:30:00Z',
      }
      const result = AuditLogResponseDtoSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
    })

    it('should require id field', () => {
      const { id, ...data } = validResponseData
      const result = AuditLogResponseDtoSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should require createdAt field', () => {
      const { createdAt, ...data } = validResponseData
      const result = AuditLogResponseDtoSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept ISO string format for createdAt', () => {
      const isoDate = '2024-01-15T10:30:00Z'
      const data = { ...validResponseData, createdAt: isoDate }
      const result = AuditLogResponseDtoSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept various ISO string formats', () => {
      const formats = ['2024-01-15T10:30:00Z', '2024-01-15T10:30:00.000Z', '2024-01-15T10:30:00+00:00']

      formats.forEach((format) => {
        const data = { ...validResponseData, createdAt: format }
        const result = AuditLogResponseDtoSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid id format', () => {
      const data = { ...validResponseData, id: 'not-a-uuid' }
      const result = AuditLogResponseDtoSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should inherit all validation rules from CreateAuditLogDtoSchema', () => {
      const invalidData = {
        ...validResponseData,
        organizationId: 'invalid-uuid',
      }
      const result = AuditLogResponseDtoSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('optional fields', () => {
    it('should allow undefined resourceId', () => {
      const data = { ...validResponseData, resourceId: undefined }
      const result = AuditLogResponseDtoSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow undefined metadata', () => {
      const data = { ...validResponseData, metadata: undefined }
      const result = AuditLogResponseDtoSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow undefined ipAddress', () => {
      const data = { ...validResponseData, ipAddress: undefined }
      const result = AuditLogResponseDtoSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow undefined userAgent', () => {
      const data = { ...validResponseData, userAgent: undefined }
      const result = AuditLogResponseDtoSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('DTO class instantiation', () => {
    it('should create instance of AuditLogResponseDto', () => {
      const dto = new AuditLogResponseDto(validResponseData)
      expect(dto).toBeInstanceOf(AuditLogResponseDto)
      // nestjs-zod DTOs don't expose properties directly; they use the schema for validation
      expect(dto).toBeDefined()
    })

    it('should accept instance creation even with invalid data (validation happens at controller level)', () => {
      const invalidData = { ...validResponseData, id: 'invalid-uuid' }
      // createZodDto doesn't throw on instantiation; validation happens via @Body decorator in NestJS
      const dto = new AuditLogResponseDto(invalidData)
      expect(dto).toBeInstanceOf(AuditLogResponseDto)
    })
  })

  describe('edge cases', () => {
    it('should handle empty metadata object', () => {
      const data = { ...validResponseData, metadata: {} }
      const result = AuditLogResponseDtoSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle empty strings for event and resource', () => {
      const data = { ...validResponseData, event: '', resource: '' }
      const result = AuditLogResponseDtoSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000)
      const data = { ...validResponseData, event: longString }
      const result = AuditLogResponseDtoSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should handle complex nested metadata', () => {
      const complexMetadata = {
        level1: {
          level2: {
            arrays: [1, 2, 3],
            mixed: [1, 'two', { three: 3 }],
          },
        },
      }
      const data = { ...validResponseData, metadata: complexMetadata }
      const result = AuditLogResponseDtoSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})
