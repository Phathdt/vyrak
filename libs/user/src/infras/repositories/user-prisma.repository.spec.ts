import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserPrismaRepository } from './user-prisma.repository'

import type { DatabaseService, User as PrismaUser } from '@vyrak/database'

describe('UserPrismaRepository', () => {
  let repository: UserPrismaRepository
  let databaseService: {
    client: {
      user: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
    }
  }

  const createdAt = new Date('2026-01-01T00:00:00.000Z')
  const updatedAt = new Date('2026-02-01T00:00:00.000Z')

  const prismaUser: PrismaUser = {
    id: 'user-1',
    email: 'jane@example.com',
    name: 'Jane Doe',
    emailVerified: true,
    image: 'https://example.com/avatar.png',
    passwordHash: 'hashed-password',
    createdAt,
    updatedAt,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})

    databaseService = {
      client: {
        user: {
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
      },
    }

    repository = new UserPrismaRepository(databaseService as unknown as DatabaseService)
  })

  describe('findById', () => {
    it('should query by id and map the Prisma record to a domain entity', async () => {
      databaseService.client.user.findUnique.mockResolvedValue(prismaUser)

      const result = await repository.findById('user-1')

      expect(databaseService.client.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } })
      expect(result).toEqual({
        id: 'user-1',
        email: 'jane@example.com',
        name: 'Jane Doe',
        emailVerified: true,
        image: 'https://example.com/avatar.png',
        passwordHash: 'hashed-password',
        createdAt,
        updatedAt,
      })
    })

    it('should return null when the user does not exist', async () => {
      databaseService.client.user.findUnique.mockResolvedValue(null)

      await expect(repository.findById('missing')).resolves.toBeNull()
    })

    it('should rethrow and log when Prisma fails', async () => {
      const error = new Error('connection refused')
      databaseService.client.user.findUnique.mockRejectedValue(error)

      await expect(repository.findById('user-1')).rejects.toThrow('connection refused')
      expect(console.error).toHaveBeenCalledWith('[UserPrismaRepository] findById error:', error)
    })
  })

  describe('findByEmail', () => {
    it('should query by email and map the Prisma record to a domain entity', async () => {
      databaseService.client.user.findUnique.mockResolvedValue(prismaUser)

      const result = await repository.findByEmail('jane@example.com')

      expect(databaseService.client.user.findUnique).toHaveBeenCalledWith({ where: { email: 'jane@example.com' } })
      expect(result?.id).toBe('user-1')
      expect(result?.email).toBe('jane@example.com')
    })

    it('should map nullable profile fields as null', async () => {
      databaseService.client.user.findUnique.mockResolvedValue({
        ...prismaUser,
        name: null,
        image: null,
        passwordHash: null,
      })

      const result = await repository.findByEmail('jane@example.com')

      expect(result).toMatchObject({ name: null, image: null, passwordHash: null })
    })

    it('should return null when no user matches the email', async () => {
      databaseService.client.user.findUnique.mockResolvedValue(null)

      await expect(repository.findByEmail('nobody@example.com')).resolves.toBeNull()
    })

    it('should rethrow and log when Prisma fails', async () => {
      const error = new Error('unique constraint lookup failed')
      databaseService.client.user.findUnique.mockRejectedValue(error)

      await expect(repository.findByEmail('jane@example.com')).rejects.toThrow('unique constraint lookup failed')
      expect(console.error).toHaveBeenCalledWith('[UserPrismaRepository] findByEmail error:', error)
    })
  })

  describe('create', () => {
    it('should persist the provided fields and map the result', async () => {
      databaseService.client.user.create.mockResolvedValue(prismaUser)

      const result = await repository.create({
        email: 'jane@example.com',
        name: 'Jane Doe',
        passwordHash: 'hashed-password',
      })

      expect(databaseService.client.user.create).toHaveBeenCalledWith({
        data: {
          email: 'jane@example.com',
          name: 'Jane Doe',
          passwordHash: 'hashed-password',
        },
      })
      expect(result).toMatchObject({ id: 'user-1', email: 'jane@example.com' })
    })

    it('should default omitted name and passwordHash to null', async () => {
      databaseService.client.user.create.mockResolvedValue({
        ...prismaUser,
        name: null,
        passwordHash: null,
      })

      await repository.create({ email: 'jane@example.com' })

      expect(databaseService.client.user.create).toHaveBeenCalledWith({
        data: {
          email: 'jane@example.com',
          name: null,
          passwordHash: null,
        },
      })
    })

    it('should preserve explicit nulls', async () => {
      databaseService.client.user.create.mockResolvedValue({
        ...prismaUser,
        name: null,
        passwordHash: null,
      })

      await repository.create({ email: 'jane@example.com', name: null, passwordHash: null })

      expect(databaseService.client.user.create).toHaveBeenCalledWith({
        data: {
          email: 'jane@example.com',
          name: null,
          passwordHash: null,
        },
      })
    })

    it('should rethrow and log when Prisma fails', async () => {
      const error = new Error('unique constraint violation')
      databaseService.client.user.create.mockRejectedValue(error)

      await expect(repository.create({ email: 'jane@example.com' })).rejects.toThrow('unique constraint violation')
      expect(console.error).toHaveBeenCalledWith('[UserPrismaRepository] create error:', error)
    })
  })

  describe('update', () => {
    it('should pass the patch through unchanged and map the result', async () => {
      const updated = { ...prismaUser, name: 'Jane Smith', image: null }
      databaseService.client.user.update.mockResolvedValue(updated)

      const result = await repository.update('user-1', { name: 'Jane Smith', image: null })

      expect(databaseService.client.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Jane Smith', image: null },
      })
      expect(result.name).toBe('Jane Smith')
      expect(result.image).toBeNull()
    })

    it('should forward email verification and email changes', async () => {
      databaseService.client.user.update.mockResolvedValue({
        ...prismaUser,
        email: 'new@example.com',
        emailVerified: false,
      })

      await repository.update('user-1', { email: 'new@example.com', emailVerified: false })

      expect(databaseService.client.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { email: 'new@example.com', emailVerified: false },
      })
    })

    it('should rethrow and log when Prisma fails', async () => {
      const error = new Error('record to update not found')
      databaseService.client.user.update.mockRejectedValue(error)

      await expect(repository.update('missing', { name: 'Nobody' })).rejects.toThrow('record to update not found')
      expect(console.error).toHaveBeenCalledWith('[UserPrismaRepository] update error:', error)
    })
  })
})
