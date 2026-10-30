import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthService } from './auth.service'

import type { IAuthRepository, UserWithOrganizations } from '../../domain'

describe('AuthService', () => {
  let service: AuthService
  let mockRepository: IAuthRepository
  let mockUserService: any
  let mockOrganizationService: any
  let mockJwtProvider: any
  let mockPasswordService: any

  beforeEach(() => {
    mockRepository = {
      findUserById: vi.fn(),
    }

    mockUserService = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
    }

    mockOrganizationService = {
      findAllForUser: vi.fn(),
      create: vi.fn(),
    }

    mockJwtProvider = {
      sign: vi.fn(),
    }

    mockPasswordService = {
      verify: vi.fn(),
    }

    service = new AuthService(
      mockRepository,
      mockUserService,
      mockOrganizationService,
      mockJwtProvider,
      mockPasswordService
    )
  })

  describe('getCurrentUser', () => {
    it('should return user with organizations', async () => {
      const mockUser: UserWithOrganizations = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: false,
        image: null,
        members: [
          {
            id: 'member-1',
            organizationId: 'org-1',
            userId: 'user-123',
            role: 'owner',
            createdAt: new Date(),
            organization: {
              id: 'org-1',
              name: 'Test Org',
              slug: 'test-org',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      }

      // Mock onboarding check - user already has org
      vi.mocked(mockOrganizationService.findAllForUser).mockResolvedValue([{ id: 'org-1' }])
      vi.mocked(mockRepository.findUserById).mockResolvedValue(mockUser)

      const result = await service.getCurrentUser('user-123')

      expect(result).toEqual(mockUser)
      expect(mockOrganizationService.findAllForUser).toHaveBeenCalledWith('user-123')
      expect(mockRepository.findUserById).toHaveBeenCalledWith('user-123')
    })

    it('should return null if user not found', async () => {
      vi.mocked(mockOrganizationService.findAllForUser).mockResolvedValue([])
      vi.mocked(mockRepository.findUserById).mockResolvedValue(null)

      const result = await service.getCurrentUser('nonexistent')

      expect(result).toBeNull()
      expect(mockRepository.findUserById).toHaveBeenCalledWith('nonexistent')
    })

    it('should handle repository errors', async () => {
      vi.mocked(mockOrganizationService.findAllForUser).mockResolvedValue([])
      vi.mocked(mockRepository.findUserById).mockRejectedValue(new Error('Database connection lost'))

      await expect(service.getCurrentUser('user-456')).rejects.toThrow('Database connection lost')
    })

    it('should create personal organization for new user without organizations', async () => {
      const mockUser = {
        id: 'user-new',
        name: 'New User',
        email: 'new@example.com',
        emailVerified: false,
        image: null,
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockUserWithOrg: UserWithOrganizations = {
        id: 'user-new',
        email: 'new@example.com',
        name: 'New User',
        emailVerified: false,
        image: null,
        members: [],
      }

      // Mock: user has no organizations
      vi.mocked(mockOrganizationService.findAllForUser).mockResolvedValue([])
      vi.mocked(mockUserService.findById).mockResolvedValue(mockUser)
      vi.mocked(mockOrganizationService.create).mockResolvedValue({ id: 'org-new' })
      vi.mocked(mockRepository.findUserById).mockResolvedValue(mockUserWithOrg)

      const result = await service.getCurrentUser('user-new')

      expect(mockOrganizationService.findAllForUser).toHaveBeenCalledWith('user-new')
      expect(mockUserService.findById).toHaveBeenCalledWith('user-new')
      expect(mockOrganizationService.create).toHaveBeenCalledWith('user-new', {
        name: "New User's Workspace",
        slug: 'personal-user-new',
      })
      expect(result).toEqual(mockUserWithOrg)
    })
  })
})
