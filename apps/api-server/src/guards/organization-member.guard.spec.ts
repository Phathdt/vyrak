import { ForbiddenException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OrganizationMemberGuard } from './organization-member.guard'

import type { DatabaseService } from '@vyrak/database'

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
    }

    guard = new OrganizationMemberGuard(mockPrisma as unknown as DatabaseService)
  })

  const createMockContext = (
    userId?: string,
    params: Record<string, string> = {},
    query: Record<string, string> = {}
  ) => {
    const request = {
      user: userId ? { userId } : undefined,
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
    describe('authentication check', () => {
      it('should throw ForbiddenException if userId not present', async () => {
        const context = createMockContext(undefined)

        await expect(guard.canActivate(context)).rejects.toThrow('Authentication required')
        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
      })

      it('should throw ForbiddenException if userId is empty string', async () => {
        const context = createMockContext('')

        await expect(guard.canActivate(context)).rejects.toThrow('Authentication required')
      })

      it('should throw ForbiddenException if userId is null', async () => {
        const context = createMockContext(null as any)

        await expect(guard.canActivate(context)).rejects.toThrow('Authentication required')
      })
    })

    describe('no organization context', () => {
      it('should allow access if no organizationId in route', async () => {
        const context = createMockContext('user-123')

        const result = await guard.canActivate(context)

        expect(result).toBe(true)
        expect(mockPrisma.withSystemAccess).not.toHaveBeenCalled()
      })

      it('should allow access with empty params and query', async () => {
        const context = createMockContext('user-456', {}, {})

        const result = await guard.canActivate(context)

        expect(result).toBe(true)
        expect(mockPrisma.withSystemAccess).not.toHaveBeenCalled()
      })
    })

    describe('organization from params.organizationId', () => {
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
      })

      it('should call withSystemAccess when verifying membership', async () => {
        const context = createMockContext('user-123', { organizationId: 'org-456' })

        mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
        mockPrisma.client.member.findUnique.mockResolvedValue({
          id: 'member-1',
          role: 'member',
        })

        await guard.canActivate(context)

        expect(mockPrisma.withSystemAccess).toHaveBeenCalled()
        expect(typeof mockPrisma.withSystemAccess.mock.calls[0][0]).toBe('function')
      })

      it('should query member with correct parameters', async () => {
        const context = createMockContext('user-123', { organizationId: 'org-456' })

        mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
        mockPrisma.client.member.findUnique.mockResolvedValue({
          id: 'member-1',
          role: 'admin',
        })

        await guard.canActivate(context)

        expect(mockPrisma.client.member.findUnique).toHaveBeenCalledWith({
          where: {
            organizationId_userId: {
              organizationId: 'org-456',
              userId: 'user-123',
            },
          },
        })
      })
    })

    describe('organization from params.orgId', () => {
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
      })

      it('should use orgId when organizationId is not present', async () => {
        const context = createMockContext('user-123', { orgId: 'org-backup' })

        mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
        mockPrisma.client.member.findUnique.mockResolvedValue({
          id: 'member-1',
          role: 'owner',
        })

        await guard.canActivate(context)

        expect(mockPrisma.client.member.findUnique).toHaveBeenCalledWith({
          where: {
            organizationId_userId: {
              organizationId: 'org-backup',
              userId: 'user-123',
            },
          },
        })
      })
    })

    describe('organization from query.organizationId', () => {
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

      it('should handle query.organizationId as string', async () => {
        const context = createMockContext('user-123', {}, { organizationId: 'org-query' })

        mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
        mockPrisma.client.member.findUnique.mockResolvedValue({
          id: 'member-1',
          role: 'member',
        })

        await guard.canActivate(context)

        expect(mockPrisma.client.member.findUnique).toHaveBeenCalledWith({
          where: {
            organizationId_userId: {
              organizationId: 'org-query',
              userId: 'user-123',
            },
          },
        })
      })
    })

    describe('priority and fallback', () => {
      it('should prioritize params.organizationId over params.orgId', async () => {
        const context = createMockContext('user-123', {
          organizationId: 'org-primary',
          orgId: 'org-secondary',
        })

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

      it('should prioritize params.orgId over query.organizationId', async () => {
        const context = createMockContext('user-123', { orgId: 'org-params' }, { organizationId: 'org-query' })

        mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
        mockPrisma.client.member.findUnique.mockResolvedValue({
          id: 'member-1',
          role: 'admin',
        })

        await guard.canActivate(context)

        expect(mockPrisma.client.member.findUnique).toHaveBeenCalledWith({
          where: {
            organizationId_userId: {
              organizationId: 'org-params',
              userId: 'user-123',
            },
          },
        })
      })

      it('should prioritize params.organizationId over query.organizationId', async () => {
        const context = createMockContext(
          'user-123',
          { organizationId: 'org-params-first' },
          { organizationId: 'org-query-second' }
        )

        mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
        mockPrisma.client.member.findUnique.mockResolvedValue({
          id: 'member-1',
          role: 'member',
        })

        await guard.canActivate(context)

        expect(mockPrisma.client.member.findUnique).toHaveBeenCalledWith({
          where: {
            organizationId_userId: {
              organizationId: 'org-params-first',
              userId: 'user-123',
            },
          },
        })
      })
    })

    describe('membership error handling', () => {
      it('should throw ForbiddenException if not a member', async () => {
        const context = createMockContext('user-123', { organizationId: 'org-456' })

        mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
        mockPrisma.client.member.findUnique.mockResolvedValue(null)

        await expect(guard.canActivate(context)).rejects.toThrow('Not a member of this organization')
        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException)
      })

      it('should not set tenant context if user is not a member', async () => {
        const context = createMockContext('user-123', { organizationId: 'org-456' })

        mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
        mockPrisma.client.member.findUnique.mockResolvedValue(null)

        try {
          await guard.canActivate(context)
        } catch (error) {
          // Expected
        }
      })

      it('should throw ForbiddenException with correct message', async () => {
        const context = createMockContext('user-123', { organizationId: 'org-456' })

        mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
        mockPrisma.client.member.findUnique.mockResolvedValue(null)

        try {
          await guard.canActivate(context)
          expect.fail('Should have thrown')
        } catch (error) {
          expect(error).toBeInstanceOf(ForbiddenException)
          expect((error as ForbiddenException).message).toBe('Not a member of this organization')
        }
      })
    })

    describe('tenant context setting', () => {
      it('should set organization ID on request after verification', async () => {
        const context = createMockContext('user-123', { organizationId: 'org-456' })

        mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
        mockPrisma.client.member.findUnique.mockResolvedValue({
          id: 'member-1',
          role: 'member',
        })

        await guard.canActivate(context)
        const request = context.switchToHttp().getRequest()

        expect(request.organizationId).toBe('org-456')
      })

      it('should set member role on request', async () => {
        const context = createMockContext('user-123', { organizationId: 'org-456' })

        mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
        mockPrisma.client.member.findUnique.mockResolvedValue({
          id: 'member-1',
          role: 'admin',
        })

        await guard.canActivate(context)
        const request = context.switchToHttp().getRequest()

        expect(request.memberRole).toBe('admin')
      })

      it('should preserve different member roles', async () => {
        const roles = ['owner', 'admin', 'member', 'viewer']

        for (const role of roles) {
          const context = createMockContext('user-123', { organizationId: 'org-456' })

          mockPrisma.withSystemAccess.mockImplementation((callback: any) => callback())
          mockPrisma.client.member.findUnique.mockResolvedValue({
            id: 'member-1',
            role,
          })

          await guard.canActivate(context)
          const request = context.switchToHttp().getRequest()

          expect(request.memberRole).toBe(role)
        }
      })
    })

    describe('system access bypass', () => {
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
        expect(mockPrisma.withSystemAccess).toHaveBeenCalled()
      })

      it('should ensure member query runs within system access context', async () => {
        const context = createMockContext('user-123', { organizationId: 'org-456' })

        const callOrder: string[] = []

        mockPrisma.withSystemAccess.mockImplementation(async (callback: any) => {
          callOrder.push('withSystemAccess-start')
          const result = await callback()
          callOrder.push('withSystemAccess-end')
          return result
        })

        mockPrisma.client.member.findUnique.mockImplementation(() => {
          callOrder.push('findUnique')
          return Promise.resolve({ id: 'member-1', role: 'member' })
        })

        await guard.canActivate(context)

        expect(callOrder).toContain('withSystemAccess-start')
        expect(callOrder).toContain('findUnique')
        expect(callOrder).toContain('withSystemAccess-end')
      })
    })

    describe('invalid organizationId handling', () => {
      it('should allow request if organizationId is not string type', async () => {
        const context = createMockContext('user-123', {})
        context.switchToHttp().getRequest().query = { organizationId: ['org-1', 'org-2'] }

        const result = await guard.canActivate(context)

        expect(result).toBe(true)
        expect(mockPrisma.withSystemAccess).not.toHaveBeenCalled()
      })

      it('should allow request if organizationId is empty string', async () => {
        const context = createMockContext('user-123', {})
        context.switchToHttp().getRequest().query = { organizationId: '' }

        const result = await guard.canActivate(context)

        expect(result).toBe(true)
        expect(mockPrisma.withSystemAccess).not.toHaveBeenCalled()
      })
    })
  })
})
