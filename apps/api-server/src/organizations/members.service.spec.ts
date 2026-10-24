import { BadRequestException, ForbiddenException } from '@nestjs/common'
import type { DatabaseService } from '@vyrak/database'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MembersService } from './members.service'

describe('MembersService', () => {
  let service: MembersService
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      client: {
        member: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          count: vi.fn(),
        },
      },
    }

    service = new MembersService(mockPrisma as unknown as DatabaseService)
  })

  describe('list', () => {
    it('should list all members for valid member', async () => {
      // Mock membership verification
      mockPrisma.client.member.findUnique.mockResolvedValue({
        id: 'member-1',
        role: 'member',
      })

      // Mock member list
      mockPrisma.client.member.findMany.mockResolvedValue([
        {
          id: 'member-1',
          role: 'owner',
          createdAt: new Date(),
          user: {
            id: 'user-1',
            name: 'Owner User',
            email: 'owner@test.com',
            image: null,
          },
        },
        {
          id: 'member-2',
          role: 'member',
          createdAt: new Date(),
          user: {
            id: 'user-2',
            name: 'Member User',
            email: 'member@test.com',
            image: null,
          },
        },
      ])

      const result = await service.list('org-123', 'user-2')

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: 'member-1',
        role: 'owner',
        user: {
          id: 'user-1',
          email: 'owner@test.com',
        },
      })
    })

    it('should throw ForbiddenException if not a member', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValue(null)

      await expect(service.list('org-123', 'non-member')).rejects.toThrow(ForbiddenException)
    })
  })

  describe('updateRole', () => {
    it('should allow owner to change member role', async () => {
      // Mock actor (owner)
      mockPrisma.client.member.findUnique
        .mockResolvedValueOnce({
          id: 'actor-member',
          role: 'owner',
        })
        .mockResolvedValueOnce({
          id: 'target-member',
          organizationId: 'org-123',
          role: 'member',
          user: {
            id: 'user-2',
            name: 'Target User',
            email: 'target@test.com',
            image: null,
          },
        })

      mockPrisma.client.member.update.mockResolvedValue({
        id: 'target-member',
        role: 'admin',
        createdAt: new Date(),
        user: {
          id: 'user-2',
          name: 'Target User',
          email: 'target@test.com',
          image: null,
        },
      })

      const result = await service.updateRole('org-123', 'target-member', 'user-1', { role: 'admin' })

      expect(result.role).toBe('admin')
      expect(mockPrisma.client.member.update).toHaveBeenCalledWith({
        where: { id: 'target-member' },
        data: { role: 'admin' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      })
    })

    it('should prevent admin from promoting to owner', async () => {
      // Mock actor (admin)
      mockPrisma.client.member.findUnique
        .mockResolvedValueOnce({
          id: 'actor-member',
          role: 'admin',
        })
        .mockResolvedValueOnce({
          id: 'target-member',
          organizationId: 'org-123',
          role: 'member',
        })

      await expect(
        service.updateRole('org-123', 'target-member', 'admin-user', {
          role: 'owner',
        })
      ).rejects.toThrow('Admins cannot modify owner roles')

      expect(mockPrisma.client.member.update).not.toHaveBeenCalled()
    })

    it('should prevent admin from modifying existing owner', async () => {
      // Mock actor (admin)
      mockPrisma.client.member.findUnique
        .mockResolvedValueOnce({
          id: 'actor-member',
          role: 'admin',
        })
        .mockResolvedValueOnce({
          id: 'target-member',
          organizationId: 'org-123',
          role: 'owner',
        })

      await expect(
        service.updateRole('org-123', 'target-member', 'admin-user', {
          role: 'admin',
        })
      ).rejects.toThrow('Admins cannot modify owner roles')
    })

    it('should prevent demoting last owner', async () => {
      // Mock actor (owner)
      mockPrisma.client.member.findUnique
        .mockResolvedValueOnce({
          id: 'actor-member',
          role: 'owner',
        })
        .mockResolvedValueOnce({
          id: 'target-member',
          organizationId: 'org-123',
          role: 'owner',
        })

      // Only 1 owner
      mockPrisma.client.member.count.mockResolvedValue(1)

      await expect(
        service.updateRole('org-123', 'target-member', 'owner-user', {
          role: 'admin',
        })
      ).rejects.toThrow('Cannot demote last owner')

      expect(mockPrisma.client.member.update).not.toHaveBeenCalled()
    })

    it('should allow demoting owner if multiple owners exist', async () => {
      // Mock actor (owner)
      mockPrisma.client.member.findUnique
        .mockResolvedValueOnce({
          id: 'actor-member',
          role: 'owner',
        })
        .mockResolvedValueOnce({
          id: 'target-member',
          organizationId: 'org-123',
          role: 'owner',
          user: {
            id: 'user-2',
            name: 'Target User',
            email: 'target@test.com',
            image: null,
          },
        })

      // 2 owners exist
      mockPrisma.client.member.count.mockResolvedValue(2)

      mockPrisma.client.member.update.mockResolvedValue({
        id: 'target-member',
        role: 'admin',
        createdAt: new Date(),
        user: {
          id: 'user-2',
          name: 'Target User',
          email: 'target@test.com',
          image: null,
        },
      })

      const result = await service.updateRole('org-123', 'target-member', 'owner-user', { role: 'admin' })

      expect(result.role).toBe('admin')
    })

    it('should throw BadRequestException if member not found', async () => {
      mockPrisma.client.member.findUnique
        .mockResolvedValueOnce({
          id: 'actor-member',
          role: 'owner',
        })
        .mockResolvedValueOnce(null)

      await expect(
        service.updateRole('org-123', 'nonexistent', 'owner-user', {
          role: 'admin',
        })
      ).rejects.toThrow('Member not found')
    })

    it('should throw BadRequestException if member belongs to different org', async () => {
      mockPrisma.client.member.findUnique
        .mockResolvedValueOnce({
          id: 'actor-member',
          role: 'owner',
        })
        .mockResolvedValueOnce({
          id: 'target-member',
          organizationId: 'different-org',
          role: 'member',
        })

      await expect(
        service.updateRole('org-123', 'target-member', 'owner-user', {
          role: 'admin',
        })
      ).rejects.toThrow('Member not found')
    })
  })

  describe('remove', () => {
    it('should allow owner to remove member', async () => {
      // Mock actor verification
      mockPrisma.client.member.findUnique
        .mockResolvedValueOnce({
          id: 'actor-member',
          role: 'owner',
        })
        .mockResolvedValueOnce({
          id: 'target-member',
          organizationId: 'org-123',
          role: 'member',
        })

      mockPrisma.client.member.delete.mockResolvedValue({})

      await service.remove('org-123', 'target-member', 'owner-user')

      expect(mockPrisma.client.member.delete).toHaveBeenCalledWith({
        where: { id: 'target-member' },
      })
    })

    it('should allow admin to remove member', async () => {
      // Mock actor verification
      mockPrisma.client.member.findUnique
        .mockResolvedValueOnce({
          id: 'actor-member',
          role: 'admin',
        })
        .mockResolvedValueOnce({
          id: 'target-member',
          organizationId: 'org-123',
          role: 'member',
        })

      mockPrisma.client.member.delete.mockResolvedValue({})

      await service.remove('org-123', 'target-member', 'admin-user')

      expect(mockPrisma.client.member.delete).toHaveBeenCalled()
    })

    it('should prevent removing last owner', async () => {
      // Mock actor verification
      mockPrisma.client.member.findUnique
        .mockResolvedValueOnce({
          id: 'actor-member',
          role: 'owner',
        })
        .mockResolvedValueOnce({
          id: 'target-member',
          organizationId: 'org-123',
          role: 'owner',
        })

      // Only 1 owner
      mockPrisma.client.member.count.mockResolvedValue(1)

      await expect(service.remove('org-123', 'target-member', 'owner-user')).rejects.toThrow('Cannot remove last owner')

      expect(mockPrisma.client.member.delete).not.toHaveBeenCalled()
    })

    it('should allow removing owner if multiple owners exist', async () => {
      // Mock actor verification
      mockPrisma.client.member.findUnique
        .mockResolvedValueOnce({
          id: 'actor-member',
          role: 'owner',
        })
        .mockResolvedValueOnce({
          id: 'target-member',
          organizationId: 'org-123',
          role: 'owner',
        })

      // 2 owners exist
      mockPrisma.client.member.count.mockResolvedValue(2)
      mockPrisma.client.member.delete.mockResolvedValue({})

      await service.remove('org-123', 'target-member', 'owner-user')

      expect(mockPrisma.client.member.delete).toHaveBeenCalled()
    })

    it('should throw ForbiddenException if actor is regular member', async () => {
      mockPrisma.client.member.findUnique.mockResolvedValueOnce({
        id: 'actor-member',
        role: 'member',
      })

      await expect(service.remove('org-123', 'target-member', 'member-user')).rejects.toThrow(ForbiddenException)

      expect(mockPrisma.client.member.delete).not.toHaveBeenCalled()
    })

    it('should throw BadRequestException if member not found', async () => {
      mockPrisma.client.member.findUnique
        .mockResolvedValueOnce({
          id: 'actor-member',
          role: 'owner',
        })
        .mockResolvedValueOnce(null)

      await expect(service.remove('org-123', 'nonexistent', 'owner-user')).rejects.toThrow('Member not found')
    })
  })
})
