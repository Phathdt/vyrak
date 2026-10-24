import { BadRequestException, ForbiddenException } from '@nestjs/common'
import type { DatabaseService } from '@vyrak/database'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OrganizationsService } from './organizations.service'

describe('OrganizationsService', () => {
  let service: OrganizationsService
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      client: {
        organization: {
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        member: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
        },
        workflowRun: {
          count: vi.fn(),
        },
      },
    }

    service = new OrganizationsService(mockPrisma as unknown as DatabaseService)
  })

  describe('create', () => {
    it('should create organization with owner membership atomically', async () => {
      mockPrisma.client.organization.findUnique.mockResolvedValue(null)
      mockPrisma.client.organization.create.mockResolvedValue({
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org',
        logo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { members: 1 },
      })

      const result = await service.create('user-123', {
        name: 'Test Org',
        slug: 'test-org',
      })

      expect(mockPrisma.client.organization.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-org' },
      })

      expect(mockPrisma.client.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Org',
          slug: 'test-org',
          logo: undefined,
          members: {
            create: {
              userId: 'user-123',
              role: 'owner',
            },
          },
        },
        include: {
          _count: {
            select: { members: true },
          },
        },
      })

      expect(result).toEqual({
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org',
        logo: null,
        role: 'owner',
        memberCount: 1,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
    })

    it('should throw BadRequestException if slug already exists', async () => {
      mockPrisma.client.organization.findUnique.mockResolvedValue({
        id: 'existing-org',
        slug: 'duplicate-slug',
      })

      await expect(
        service.create('user-123', {
          name: 'New Org',
          slug: 'duplicate-slug',
        })
      ).rejects.toThrow(BadRequestException)

      expect(mockPrisma.client.organization.create).not.toHaveBeenCalled()
    })
  })

  describe('findAllForUser', () => {
    it('should return all organizations for user with roles', async () => {
      const mockMemberships = [
        {
          id: 'member-1',
          organizationId: 'org-1',
          userId: 'user-123',
          role: 'owner',
          createdAt: new Date(),
          organization: {
            id: 'org-1',
            name: 'Org 1',
            slug: 'org-1',
            logo: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { members: 3 },
          },
        },
        {
          id: 'member-2',
          organizationId: 'org-2',
          userId: 'user-123',
          role: 'member',
          createdAt: new Date(),
          organization: {
            id: 'org-2',
            name: 'Org 2',
            slug: 'org-2',
            logo: 'https://example.com/logo.png',
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { members: 5 },
          },
        },
      ]

      mockPrisma.client.member.findMany.mockResolvedValue(mockMemberships)

      const result = await service.findAllForUser('user-123')

      expect(mockPrisma.client.member.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {
          organization: {
            include: {
              _count: {
                select: { members: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'org-1',
        name: 'Org 1',
        slug: 'org-1',
        logo: null,
        role: 'owner',
        memberCount: 3,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
      expect(result[1].role).toBe('member')
    })

    it('should return empty array if user has no memberships', async () => {
      mockPrisma.client.member.findMany.mockResolvedValue([])

      const result = await service.findAllForUser('user-456')

      expect(result).toEqual([])
    })
  })

  describe('findOne', () => {
    it('should return organization details for member', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        organizationId: 'org-123',
        userId: 'user-123',
        role: 'admin',
        organization: {
          id: 'org-123',
          name: 'Test Org',
          slug: 'test-org',
          logo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { members: 5 },
        },
      })

      const result = await service.findOne('org-123', 'user-123')

      expect(result).toEqual({
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org',
        logo: null,
        role: 'admin',
        memberCount: 5,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
    })

    it('should throw ForbiddenException if not a member', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue(null)

      await expect(service.findOne('org-123', 'non-member')).rejects.toThrow(ForbiddenException)
    })
  })

  describe('update', () => {
    it('should update organization for admin', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'admin',
      })

      mockPrisma.client.organization.update.mockResolvedValue({
        id: 'org-123',
        name: 'Updated Org',
        slug: 'test-org',
        logo: 'https://example.com/new-logo.png',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { members: 3 },
      })

      const result = await service.update('org-123', 'user-123', {
        name: 'Updated Org',
        logo: 'https://example.com/new-logo.png',
      })

      expect(result.name).toBe('Updated Org')
      expect(result.logo).toBe('https://example.com/new-logo.png')
    })

    it('should update organization for owner', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'owner',
      })

      mockPrisma.client.organization.update.mockResolvedValue({
        id: 'org-123',
        name: 'Updated Org',
        slug: 'test-org',
        logo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { members: 1 },
      })

      const result = await service.update('org-123', 'user-123', {
        name: 'Updated Org',
      })

      expect(result.name).toBe('Updated Org')
    })

    it('should throw ForbiddenException for regular member', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'member',
      })

      await expect(service.update('org-123', 'user-123', { name: 'Updated' })).rejects.toThrow(ForbiddenException)

      expect(mockPrisma.client.organization.update).not.toHaveBeenCalled()
    })

    it('should throw ForbiddenException for non-member', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue(null)

      await expect(service.update('org-123', 'non-member', { name: 'Updated' })).rejects.toThrow(ForbiddenException)
    })
  })

  describe('delete', () => {
    it('should delete organization if owner and no active workflow runs', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'owner',
      })

      mockPrisma.client.workflowRun.count.mockResolvedValue(0)
      mockPrisma.client.organization.delete.mockResolvedValue({})

      await service.delete('org-123', 'user-123')

      expect(mockPrisma.client.workflowRun.count).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-123',
          status: { in: ['pending', 'running'] },
        },
      })

      expect(mockPrisma.client.organization.delete).toHaveBeenCalledWith({
        where: { id: 'org-123' },
      })
    })

    it('should throw BadRequestException if active workflow runs exist', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'owner',
      })

      mockPrisma.client.workflowRun.count.mockResolvedValue(3)

      await expect(service.delete('org-123', 'user-123')).rejects.toThrow(BadRequestException)

      expect(mockPrisma.client.organization.delete).not.toHaveBeenCalled()
    })

    it('should throw ForbiddenException if not owner', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'admin',
      })

      await expect(service.delete('org-123', 'user-123')).rejects.toThrow(ForbiddenException)

      expect(mockPrisma.client.workflowRun.count).not.toHaveBeenCalled()
      expect(mockPrisma.client.organization.delete).not.toHaveBeenCalled()
    })
  })

  describe('verifyMembership', () => {
    it('should return membership if user has allowed role', async () => {
      const mockMembership = {
        id: 'member-1',
        organizationId: 'org-123',
        userId: 'user-123',
        role: 'admin',
      }

      mockPrisma.client.member.findUnique.mockResolvedValue(mockMembership)

      const result = await service.verifyMembership('org-123', 'user-123', ['owner', 'admin'])

      expect(result).toEqual(mockMembership)
    })

    it('should throw ForbiddenException if not a member', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue(null)

      await expect(service.verifyMembership('org-123', 'user-123', ['owner'])).rejects.toThrow(
        'Not a member of this organization'
      )
    })

    it('should throw ForbiddenException if insufficient permissions', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'member',
      })

      await expect(service.verifyMembership('org-123', 'user-123', ['owner', 'admin'])).rejects.toThrow(
        'Insufficient permissions'
      )
    })

    it('should verify multiple allowed roles correctly', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'owner',
      })

      const result = await service.verifyMembership('org-123', 'user-123', ['owner', 'admin', 'member'])
      expect(result.role).toBe('owner')
    })

    it("should reject when only one role doesn't match", async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'moderator',
      })

      await expect(service.verifyMembership('org-123', 'user-123', ['owner', 'admin'])).rejects.toThrow(
        ForbiddenException
      )
    })
  })

  describe('Branch Coverage - Error Scenarios', () => {
    it('create: should handle logo provided in DTO', async () => {
      mockPrisma.client.organization.findUnique.mockResolvedValue(null)
      mockPrisma.client.organization.create.mockResolvedValue({
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org',
        logo: 'https://example.com/logo.png',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { members: 1 },
      })

      const result = await service.create('user-123', {
        name: 'Test Org',
        slug: 'test-org',
        logo: 'https://example.com/logo.png',
      })

      expect(result.logo).toBe('https://example.com/logo.png')
      expect(mockPrisma.client.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            logo: 'https://example.com/logo.png',
          }),
        })
      )
    })

    it('findAllForUser: should map all membership properties correctly', async () => {
      mockPrisma.client.member.findMany.mockResolvedValue([
        {
          id: 'member-1',
          organizationId: 'org-1',
          userId: 'user-123',
          role: 'admin',
          createdAt: new Date(),
          organization: {
            id: 'org-1',
            name: 'Admin Org',
            slug: 'admin-org',
            logo: 'https://example.com/admin-logo.png',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-06-01'),
            _count: { members: 10 },
          },
        },
      ])

      const result = await service.findAllForUser('user-123')

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'org-1',
        name: 'Admin Org',
        slug: 'admin-org',
        logo: 'https://example.com/admin-logo.png',
        role: 'admin',
        memberCount: 10,
      })
      expect(result[0].createdAt).toEqual(new Date('2024-01-01'))
      expect(result[0].updatedAt).toEqual(new Date('2024-06-01'))
    })

    it('delete: should check workflow runs with correct status filter', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'owner',
      })

      mockPrisma.client.workflowRun.count.mockResolvedValue(0)
      mockPrisma.client.organization.delete.mockResolvedValue({})

      await service.delete('org-123', 'user-123')

      expect(mockPrisma.client.workflowRun.count).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-123',
          status: { in: ['pending', 'running'] },
        },
      })
    })

    it('delete: should include error message with active run count', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'owner',
      })

      mockPrisma.client.workflowRun.count.mockResolvedValue(5)

      const error = service.delete('org-123', 'user-123')
      await expect(error).rejects.toThrow('Cannot delete organization with 5 active workflow run(s)')
    })

    it('update: should preserve admin role verification', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'admin',
      })

      mockPrisma.client.organization.update.mockResolvedValue({
        id: 'org-123',
        name: 'Updated',
        slug: 'updated',
        logo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { members: 1 },
      })

      const result = await service.update('org-123', 'user-123', { name: 'Updated' })

      expect(result.role).toBe('admin')
    })

    it('findOne: should handle organization with logo', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        organizationId: 'org-123',
        userId: 'user-123',
        role: 'member',
        organization: {
          id: 'org-123',
          name: 'Test Org',
          slug: 'test-org',
          logo: 'https://example.com/logo.png',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-06-01'),
          _count: { members: 5 },
        },
      })

      const result = await service.findOne('org-123', 'user-123')

      expect(result.logo).toBe('https://example.com/logo.png')
      expect(result.role).toBe('member')
      expect(result.memberCount).toBe(5)
    })
  })
})
