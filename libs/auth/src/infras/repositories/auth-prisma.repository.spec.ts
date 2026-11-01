import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthPrismaRepository } from './auth-prisma.repository'

import type { DatabaseService } from '@vyrak/database'

describe('AuthPrismaRepository', () => {
  let repository: AuthPrismaRepository
  let databaseService: {
    withSystemAccess: ReturnType<typeof vi.fn>
    client: {
      user: { findUnique: ReturnType<typeof vi.fn> }
      member: { findMany: ReturnType<typeof vi.fn> }
      organization: { findMany: ReturnType<typeof vi.fn> }
    }
  }

  const createdAt = new Date('2026-01-01T00:00:00.000Z')
  const updatedAt = new Date('2026-02-01T00:00:00.000Z')

  const prismaUser = {
    id: 'user-1',
    email: 'jane@example.com',
    name: 'Jane Doe',
    emailVerified: true,
    image: null,
    passwordHash: 'hashed-password',
    createdAt,
    updatedAt,
  }

  const prismaMember = {
    id: 'member-1',
    organizationId: 'org-1',
    userId: 'user-1',
    role: 'admin',
    createdAt,
  }

  const prismaOrganization = {
    id: 'org-1',
    name: 'Acme',
    slug: 'acme',
    logo: null,
    createdAt,
    updatedAt,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})

    databaseService = {
      withSystemAccess: vi.fn(async (callback: () => Promise<unknown>) => callback()),
      client: {
        user: { findUnique: vi.fn() },
        member: { findMany: vi.fn() },
        organization: { findMany: vi.fn() },
      },
    }

    repository = new AuthPrismaRepository(databaseService as unknown as DatabaseService)
  })

  describe('findUserById', () => {
    it('should load the user inside a system-access context', async () => {
      databaseService.client.user.findUnique.mockResolvedValue(prismaUser)
      databaseService.client.member.findMany.mockResolvedValue([])
      databaseService.client.organization.findMany.mockResolvedValue([])

      await repository.findUserById('user-1')

      expect(databaseService.withSystemAccess).toHaveBeenCalledTimes(1)
      expect(databaseService.client.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } })
    })

    it('should return null when the user does not exist', async () => {
      databaseService.client.user.findUnique.mockResolvedValue(null)

      await expect(repository.findUserById('missing')).resolves.toBeNull()
      expect(databaseService.client.member.findMany).not.toHaveBeenCalled()
    })

    it('should compose memberships with their organization details', async () => {
      databaseService.client.user.findUnique.mockResolvedValue(prismaUser)
      databaseService.client.member.findMany.mockResolvedValue([prismaMember])
      databaseService.client.organization.findMany.mockResolvedValue([prismaOrganization])

      const result = await repository.findUserById('user-1')

      expect(databaseService.client.member.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } })
      expect(databaseService.client.organization.findMany).toHaveBeenCalledWith({ where: { id: { in: ['org-1'] } } })
      expect(result).toEqual({
        id: 'user-1',
        email: 'jane@example.com',
        name: 'Jane Doe',
        emailVerified: true,
        image: null,
        members: [
          {
            id: 'member-1',
            organizationId: 'org-1',
            userId: 'user-1',
            role: 'admin',
            createdAt,
            organization: {
              id: 'org-1',
              name: 'Acme',
              slug: 'acme',
              logo: null,
              createdAt,
              updatedAt,
            },
          },
        ],
      })
    })

    it('should return an empty members array when the user has no memberships', async () => {
      databaseService.client.user.findUnique.mockResolvedValue(prismaUser)
      databaseService.client.member.findMany.mockResolvedValue([])
      databaseService.client.organization.findMany.mockResolvedValue([])

      const result = await repository.findUserById('user-1')

      expect(result?.members).toEqual([])
      expect(databaseService.client.organization.findMany).toHaveBeenCalledWith({ where: { id: { in: [] } } })
    })

    it('should rethrow and log when the system-access lookup fails', async () => {
      const error = new Error('connection refused')
      databaseService.withSystemAccess.mockRejectedValue(error)

      await expect(repository.findUserById('user-1')).rejects.toThrow('connection refused')
      expect(console.error).toHaveBeenCalledWith('[AuthPrismaRepository] findUserById error:', error)
    })
  })
})
