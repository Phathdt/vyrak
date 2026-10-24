import { ForbiddenException } from '@nestjs/common'
import type { DatabaseService } from '@vyrak/database'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OrganizationMemberGuard } from './organization-member.guard'

describe('OrganizationMemberGuard', () => {
  let guard: OrganizationMemberGuard
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      client: {
        member: {
          findUnique: vi.fn(),
        },
      },
      withSystemAccess: vi.fn(),
      setTenantContext: vi.fn(),
    }

    guard = new OrganizationMemberGuard(mockPrisma as unknown as DatabaseService)
  })

  const createMockContext = (
    userId?: string,
    params: Record<string, string> = {},
    query: Record<string, string> = {}
  ) => {
    const request = {
      userId,
      params,
      query,
      organizationId: undefined,
      memberRole: undefined,
    }

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any
  }

  describe('canActivate', () => {
    it('should throw ForbiddenException if userId not present', async () => {
      const context = createMockContext(undefined)

      await expect(guard.canActivate(context)).rejects.toThrow('Authentication required')
    })

    it('should allow access if no organizationId in route', async () => {
      const context = createMockContext('user-123')

      const result = await guard.canActivate(context)

      expect(result).toBe(true)
      expect(mockPrisma.withSystemAccess).not.toHaveBeenCalled()
    })

    it('should verify membership from params.organizationId', async () => {
      const context = createMockContext('user-123', { organizationId: 'org-456' })

      const mockMembership = {
        id: 'member-1',
        organizationId: 'org-456',
        userId: 'user-123',
        role: 'admin',
      }

      mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
      mockPrisma.client.member.findUnique.mockResolvedValue(mockMembership)

      const result = await guard.canActivate(context)
      const request = context.switchToHttp().getRequest()

      expect(result).toBe(true)
      expect(request.organizationId).toBe('org-456')
      expect(request.memberRole).toBe('admin')
      expect(mockPrisma.setTenantContext).toHaveBeenCalledWith('org-456')
    })

    it('should verify membership from params.orgId', async () => {
      const context = createMockContext('user-123', { orgId: 'org-789' })

      const mockMembership = {
        id: 'member-1',
        organizationId: 'org-789',
        userId: 'user-123',
        role: 'member',
      }

      mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
      mockPrisma.client.member.findUnique.mockResolvedValue(mockMembership)

      const result = await guard.canActivate(context)

      expect(result).toBe(true)
      expect(mockPrisma.setTenantContext).toHaveBeenCalledWith('org-789')
    })

    it('should verify membership from query.organizationId', async () => {
      const context = createMockContext('user-123', {}, { organizationId: 'org-999' })

      const mockMembership = {
        id: 'member-1',
        organizationId: 'org-999',
        userId: 'user-123',
        role: 'owner',
      }

      mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
      mockPrisma.client.member.findUnique.mockResolvedValue(mockMembership)

      const result = await guard.canActivate(context)
      const request = context.switchToHttp().getRequest()

      expect(result).toBe(true)
      expect(request.organizationId).toBe('org-999')
      expect(request.memberRole).toBe('owner')
    })

    it('should throw ForbiddenException if not a member', async () => {
      const context = createMockContext('user-123', { organizationId: 'org-456' })

      mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
      mockPrisma.client.member.findUnique.mockResolvedValue(null)

      await expect(guard.canActivate(context)).rejects.toThrow('Not a member of this organization')

      expect(mockPrisma.setTenantContext).not.toHaveBeenCalled()
    })

    it('should use system access to bypass tenant filter during verification', async () => {
      const context = createMockContext('user-123', { organizationId: 'org-456' })

      const mockMembership = {
        id: 'member-1',
        role: 'member',
      }

      let withSystemAccessCalled = false
      mockPrisma.withSystemAccess.mockImplementation(async (callback: any) => {
        withSystemAccessCalled = true
        return callback()
      })
      mockPrisma.client.member.findUnique.mockResolvedValue(mockMembership)

      await guard.canActivate(context)

      expect(withSystemAccessCalled).toBe(true)
      expect(mockPrisma.client.member.findUnique).toHaveBeenCalledWith({
        where: {
          organizationId_userId: {
            organizationId: 'org-456',
            userId: 'user-123',
          },
        },
      })
    })

    it('should set tenant context after successful verification', async () => {
      const context = createMockContext('user-123', { organizationId: 'org-456' })

      mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'admin',
      })

      await guard.canActivate(context)

      expect(mockPrisma.setTenantContext).toHaveBeenCalledWith('org-456')
      expect(mockPrisma.setTenantContext).toHaveBeenCalledTimes(1)
    })

    it('should prioritize params.organizationId over params.orgId', async () => {
      const context = createMockContext('user-123', { organizationId: 'org-primary', orgId: 'org-secondary' })

      mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'member',
      })

      await guard.canActivate(context)

      expect(mockPrisma.client.member.findUnique).toHaveBeenCalledWith({
        where: {
          organizationId_userId: {
            organizationId: 'org-primary',
            userId: 'user-123',
          },
        },
      })
    })
  })
})
