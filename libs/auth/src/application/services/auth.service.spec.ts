import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthService } from './auth.service'

import type { IAuthRepository, UserWithOrganizations } from '../../domain/interfaces/auth-repository.interface'

describe('AuthService', () => {
  let service: AuthService
  let mockRepository: IAuthRepository

  beforeEach(() => {
    mockRepository = {
      hasAnyOrganization: vi.fn(),
      createPersonalOrganization: vi.fn(),
      findUserById: vi.fn(),
    }

    service = new AuthService(mockRepository)
  })

  describe('handleUserOnboarding', () => {
    it('should create personal organization for new user without organization', async () => {
      vi.mocked(mockRepository.hasAnyOrganization).mockResolvedValue(false)
      vi.mocked(mockRepository.createPersonalOrganization).mockResolvedValue(undefined)

      await service.handleUserOnboarding('user-123')

      expect(mockRepository.hasAnyOrganization).toHaveBeenCalledWith('user-123')
      expect(mockRepository.createPersonalOrganization).toHaveBeenCalledWith('user-123')
    })

    it('should not create organization if user already has one', async () => {
      vi.mocked(mockRepository.hasAnyOrganization).mockResolvedValue(true)

      await service.handleUserOnboarding('user-456')

      expect(mockRepository.hasAnyOrganization).toHaveBeenCalledWith('user-456')
      expect(mockRepository.createPersonalOrganization).not.toHaveBeenCalled()
    })

    it('should handle repository errors', async () => {
      vi.mocked(mockRepository.hasAnyOrganization).mockRejectedValue(new Error('Database error'))

      await expect(service.handleUserOnboarding('user-789')).rejects.toThrow('Database error')
    })
  })

  describe('getCurrentUser', () => {
    it('should return user with organizations', async () => {
      const mockUser: UserWithOrganizations = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [
          {
            id: 'member-1',
            organizationId: 'org-1',
            userId: 'user-123',
            role: 'owner',
            createdAt: new Date(),
            updatedAt: new Date(),
            invitedBy: null,
            organization: {
              id: 'org-1',
              name: 'Test Org',
              slug: 'test-org',
              logo: null,
              metadata: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      }

      vi.mocked(mockRepository.findUserById).mockResolvedValue(mockUser)

      const result = await service.getCurrentUser('user-123')

      expect(result).toEqual(mockUser)
      expect(mockRepository.findUserById).toHaveBeenCalledWith('user-123')
    })

    it('should return null if user not found', async () => {
      vi.mocked(mockRepository.findUserById).mockResolvedValue(null)

      const result = await service.getCurrentUser('nonexistent')

      expect(result).toBeNull()
      expect(mockRepository.findUserById).toHaveBeenCalledWith('nonexistent')
    })

    it('should handle repository errors', async () => {
      vi.mocked(mockRepository.findUserById).mockRejectedValue(new Error('Database connection lost'))

      await expect(service.getCurrentUser('user-456')).rejects.toThrow('Database connection lost')
    })
  })
})
