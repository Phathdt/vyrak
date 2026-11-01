import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserService } from './user.service'

import type { IUserRepository } from '../../domain'

describe('UserService', () => {
  let service: UserService
  let mockRepository: IUserRepository

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    }
    service = new UserService(mockRepository)
  })

  describe('findById', () => {
    it('should delegate to repository', async () => {
      const userId = 'user-123'
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: false,
        passwordHash: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findById).mockResolvedValue(mockUser)

      const result = await service.findById(userId)

      expect(result).toBe(mockUser)
      expect(mockRepository.findById).toHaveBeenCalledWith(userId)
    })

    it('should return null when user not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      const result = await service.findById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('findByEmail', () => {
    it('should delegate to repository', async () => {
      const email = 'test@example.com'
      const mockUser = {
        id: 'user-123',
        email,
        name: 'Test User',
        emailVerified: false,
        passwordHash: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.findByEmail).mockResolvedValue(mockUser)

      const result = await service.findByEmail(email)

      expect(result).toBe(mockUser)
      expect(mockRepository.findByEmail).toHaveBeenCalledWith(email)
    })

    it('should return null when user not found', async () => {
      vi.mocked(mockRepository.findByEmail).mockResolvedValue(null)

      const result = await service.findByEmail('nonexistent@example.com')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should delegate to repository with all fields', async () => {
      const data = {
        email: 'new@example.com',
        name: 'New User',
        passwordHash: 'hashed-password',
      }
      const mockCreatedUser = {
        id: 'new-user-id',
        email: data.email,
        name: data.name,
        emailVerified: false,
        passwordHash: data.passwordHash,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.create).mockResolvedValue(mockCreatedUser)

      const result = await service.create(data)

      expect(result).toBe(mockCreatedUser)
      expect(mockRepository.create).toHaveBeenCalledWith(data)
    })

    it('should handle minimal data', async () => {
      const data = { email: 'minimal@example.com' }
      const mockCreatedUser = {
        id: 'new-user-id',
        email: data.email,
        name: null,
        emailVerified: false,
        passwordHash: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.create).mockResolvedValue(mockCreatedUser)

      const result = await service.create(data)

      expect(result).toBe(mockCreatedUser)
      expect(mockRepository.create).toHaveBeenCalledWith(data)
    })
  })

  describe('update', () => {
    it('should delegate to repository with all fields', async () => {
      const userId = 'user-123'
      const data = {
        name: 'Updated Name',
        email: 'updated@example.com',
        emailVerified: true,
        image: 'https://example.com/image.jpg',
      }
      const mockUpdatedUser = {
        id: userId,
        email: data.email,
        name: data.name,
        emailVerified: data.emailVerified,
        passwordHash: null,
        image: data.image,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.update).mockResolvedValue(mockUpdatedUser)

      const result = await service.update(userId, data)

      expect(result).toBe(mockUpdatedUser)
      expect(mockRepository.update).toHaveBeenCalledWith(userId, data)
    })

    it('should handle partial updates', async () => {
      const userId = 'user-123'
      const data = { name: 'New Name Only' }
      const mockUpdatedUser = {
        id: userId,
        email: 'original@example.com',
        name: data.name,
        emailVerified: false,
        passwordHash: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.update).mockResolvedValue(mockUpdatedUser)

      const result = await service.update(userId, data)

      expect(result).toBe(mockUpdatedUser)
      expect(mockRepository.update).toHaveBeenCalledWith(userId, data)
    })

    it('should handle null values', async () => {
      const userId = 'user-123'
      const data = { name: null, image: null }
      const mockUpdatedUser = {
        id: userId,
        email: 'test@example.com',
        name: null,
        emailVerified: false,
        passwordHash: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.mocked(mockRepository.update).mockResolvedValue(mockUpdatedUser)

      const result = await service.update(userId, data)

      expect(result).toBe(mockUpdatedUser)
      expect(mockRepository.update).toHaveBeenCalledWith(userId, data)
    })
  })
})
