import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DatabaseService } from './database.service'

// Mock CustomConfigService
const mockConfigService = {
  database: {
    url: 'postgresql://test:test@localhost:5432/test',
  },
  log: {
    level: 'info',
    enableJsonFormat: false,
  },
}

describe('DatabaseService', () => {
  let service: DatabaseService

  beforeEach(() => {
    // Skip actual database connection
    process.env.SKIP_DB_CONNECTION = 'true'
    service = new DatabaseService(mockConfigService as any)
  })

  describe('setTenantContext', () => {
    it('should set tenant context with organizationId', () => {
      service.setTenantContext('org-123')

      // Access private field for testing
      expect((service as any).tenantContext).toEqual({
        organizationId: 'org-123',
        bypassTenantFilter: false,
      })
    })
  })

  describe('clearTenantContext', () => {
    it('should clear tenant context', () => {
      service.setTenantContext('org-123')
      service.clearTenantContext()

      expect((service as any).tenantContext).toEqual({})
    })
  })

  describe('withOrganization', () => {
    it('should execute callback with organization context', async () => {
      const result = await service.withOrganization('org-456', async () => {
        expect((service as any).tenantContext).toEqual({
          organizationId: 'org-456',
          bypassTenantFilter: false,
        })
        return 'test-result'
      })

      expect(result).toBe('test-result')
    })

    it('should restore previous context after execution', async () => {
      service.setTenantContext('org-123')

      await service.withOrganization('org-456', async () => {
        expect((service as any).tenantContext.organizationId).toBe('org-456')
      })

      expect((service as any).tenantContext).toEqual({
        organizationId: 'org-123',
        bypassTenantFilter: false,
      })
    })

    it('should restore context even if callback throws', async () => {
      service.setTenantContext('org-123')

      await expect(
        service.withOrganization('org-456', async () => {
          throw new Error('Test error')
        })
      ).rejects.toThrow('Test error')

      expect((service as any).tenantContext).toEqual({
        organizationId: 'org-123',
        bypassTenantFilter: false,
      })
    })
  })

  describe('withSystemAccess', () => {
    it('should execute callback with bypass flag set', async () => {
      const result = await service.withSystemAccess(async () => {
        expect((service as any).tenantContext.bypassTenantFilter).toBe(true)
        return 'system-result'
      })

      expect(result).toBe('system-result')
    })

    it('should restore previous bypass flag after execution', async () => {
      ;(service as any).tenantContext.bypassTenantFilter = false

      await service.withSystemAccess(async () => {
        expect((service as any).tenantContext.bypassTenantFilter).toBe(true)
      })

      expect((service as any).tenantContext.bypassTenantFilter).toBe(false)
    })

    it('should work with organization context set', async () => {
      service.setTenantContext('org-789')

      await service.withSystemAccess(async () => {
        expect((service as any).tenantContext).toEqual({
          organizationId: 'org-789',
          bypassTenantFilter: true,
        })
      })

      expect((service as any).tenantContext).toEqual({
        organizationId: 'org-789',
        bypassTenantFilter: false,
      })
    })
  })

  describe('mapLogLevelToPrisma', () => {
    it('should map trace to all log levels', () => {
      const result = DatabaseService.mapLogLevelToPrisma('trace')

      expect(result).toHaveLength(4)
      expect(result).toContainEqual({ emit: 'event', level: 'query' })
      expect(result).toContainEqual({ emit: 'event', level: 'info' })
      expect(result).toContainEqual({ emit: 'event', level: 'warn' })
      expect(result).toContainEqual({ emit: 'event', level: 'error' })
    })

    it('should map debug to all log levels', () => {
      const result = DatabaseService.mapLogLevelToPrisma('debug')

      expect(result).toHaveLength(4)
    })

    it('should map info to info, warn, error', () => {
      const result = DatabaseService.mapLogLevelToPrisma('info')

      expect(result).toHaveLength(3)
      expect(result).toContainEqual({ emit: 'event', level: 'info' })
      expect(result).toContainEqual({ emit: 'event', level: 'warn' })
      expect(result).toContainEqual({ emit: 'event', level: 'error' })
    })

    it('should map warn to warn, error', () => {
      const result = DatabaseService.mapLogLevelToPrisma('warn')

      expect(result).toHaveLength(2)
      expect(result).toContainEqual({ emit: 'event', level: 'warn' })
      expect(result).toContainEqual({ emit: 'event', level: 'error' })
    })

    it('should map error to error only', () => {
      const result = DatabaseService.mapLogLevelToPrisma('error')

      expect(result).toHaveLength(1)
      expect(result).toContainEqual({ emit: 'event', level: 'error' })
    })

    it('should map fatal to error only', () => {
      const result = DatabaseService.mapLogLevelToPrisma('fatal')

      expect(result).toHaveLength(1)
      expect(result).toContainEqual({ emit: 'event', level: 'error' })
    })

    it('should default to info level for unknown', () => {
      const result = DatabaseService.mapLogLevelToPrisma('unknown')

      expect(result).toHaveLength(3)
      expect(result).toContainEqual({ emit: 'event', level: 'info' })
    })
  })
})
