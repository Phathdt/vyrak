import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthService } from './auth.service'

import type { IAuthRepository, UserWithOrganizations } from '../../domain'

describe('AuthService', () => {
  let service: AuthService
  let mockRepository: IAuthRepository
  let mockJwtProvider: any
  let mockPasswordService: any

  beforeEach(() => {
    mockRepository = {
      findByEmail: vi.fn(),
      findUserById: vi.fn(),
    }

    mockJwtProvider = {
      sign: vi.fn(),
    }

    mockPasswordService = {
      verify: vi.fn(),
    }

    service = new AuthService(mockRepository, mockJwtProvider, mockPasswordService)
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
