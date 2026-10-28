import { UnauthorizedException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthController } from './auth.controller'

// Mock @vyrak/auth module - preserve all exports including DTOs
vi.mock('@vyrak/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vyrak/auth')>()
  return {
    ...actual,
    AuthService: vi.fn(() => ({
      login: vi.fn(),
      getCurrentUser: vi.fn(),
      handleUserOnboarding: vi.fn(),
    })),
  }
})

describe('AuthController', () => {
  let controller: AuthController
  let mockAuthService: any

  beforeEach(() => {
    mockAuthService = {
      login: vi.fn(),
      getCurrentUser: vi.fn(),
      handleUserOnboarding: vi.fn(),
    }

    controller = new AuthController(mockAuthService)
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('should return JWT token when credentials are valid', async () => {
      const loginDto = {
        email: 'admin@vyrak.dev',
        password: 'Password123!',
      }

      const mockResponse = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expiresIn: 86400,
        user: {
          id: 'user-123',
          email: 'admin@vyrak.dev',
          name: 'Admin User',
        },
      }

      mockAuthService.login.mockResolvedValue(mockResponse)

      const result = await controller.login(loginDto)

      expect(result).toEqual(mockResponse)
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto.email, loginDto.password)
    })

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      const loginDto = {
        email: 'admin@vyrak.dev',
        password: 'WrongPassword',
      }

      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'))

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException)
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto.email, loginDto.password)
    })

    it('should throw UnauthorizedException when user not found', async () => {
      const loginDto = {
        email: 'notfound@vyrak.dev',
        password: 'Password123!',
      }

      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'))

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('getCurrentUser', () => {
    it('should return user with organizations when JWT is valid', async () => {
      const mockRequest = {
        user: {
          userId: 'user-123',
          email: 'admin@vyrak.dev',
        },
      }

      const mockUserData = {
        id: 'user-123',
        name: 'Admin User',
        email: 'admin@vyrak.dev',
        image: 'https://example.com/avatar.jpg',
        members: [
          {
            role: 'owner',
            organization: {
              id: 'org-1',
              name: 'Acme Corporation',
              slug: 'acme-corp',
            },
          },
        ],
      }

      mockAuthService.handleUserOnboarding.mockResolvedValue(undefined)
      mockAuthService.getCurrentUser.mockResolvedValue(mockUserData)

      const result = await controller.getCurrentUser(mockRequest as any)

      expect(result.user).toEqual({
        id: 'user-123',
        name: 'Admin User',
        email: 'admin@vyrak.dev',
        image: 'https://example.com/avatar.jpg',
      })
      expect(result.organizations).toHaveLength(1)
      expect(result.organizations[0]).toEqual({
        id: 'org-1',
        name: 'Acme Corporation',
        slug: 'acme-corp',
        role: 'owner',
      })
      expect(mockAuthService.handleUserOnboarding).toHaveBeenCalledWith('user-123')
      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith('user-123')
    })

    it('should return user without organizations when user has no memberships', async () => {
      const mockRequest = {
        user: {
          userId: 'user-456',
          email: 'new@vyrak.dev',
        },
      }

      const mockUserData = {
        id: 'user-456',
        name: 'New User',
        email: 'new@vyrak.dev',
        image: null,
        members: [],
      }

      mockAuthService.handleUserOnboarding.mockResolvedValue(undefined)
      mockAuthService.getCurrentUser.mockResolvedValue(mockUserData)

      const result = await controller.getCurrentUser(mockRequest as any)

      expect(result.user).toEqual({
        id: 'user-456',
        name: 'New User',
        email: 'new@vyrak.dev',
        image: null,
      })
      expect(result.organizations).toHaveLength(0)
    })

    it('should call handleUserOnboarding before getCurrentUser', async () => {
      const mockRequest = {
        user: {
          userId: 'user-789',
          email: 'test@vyrak.dev',
        },
      }

      mockAuthService.handleUserOnboarding.mockResolvedValue(undefined)
      mockAuthService.getCurrentUser.mockResolvedValue({
        id: 'user-789',
        name: 'Test User',
        email: 'test@vyrak.dev',
        members: [],
      })

      await controller.getCurrentUser(mockRequest as any)

      expect(mockAuthService.handleUserOnboarding).toHaveBeenCalledWith('user-789')
      expect(mockAuthService.handleUserOnboarding).toHaveBeenCalledBefore(mockAuthService.getCurrentUser)
    })

    it('should handle multiple organizations', async () => {
      const mockRequest = {
        user: {
          userId: 'user-multi',
          email: 'multi@vyrak.dev',
        },
      }

      const mockUserData = {
        id: 'user-multi',
        name: 'Multi Org User',
        email: 'multi@vyrak.dev',
        image: null,
        members: [
          {
            role: 'owner',
            organization: {
              id: 'org-1',
              name: 'Org 1',
              slug: 'org-1',
            },
          },
          {
            role: 'admin',
            organization: {
              id: 'org-2',
              name: 'Org 2',
              slug: 'org-2',
            },
          },
          {
            role: 'member',
            organization: {
              id: 'org-3',
              name: 'Org 3',
              slug: 'org-3',
            },
          },
        ],
      }

      mockAuthService.handleUserOnboarding.mockResolvedValue(undefined)
      mockAuthService.getCurrentUser.mockResolvedValue(mockUserData)

      const result = await controller.getCurrentUser(mockRequest as any)

      expect(result.organizations).toHaveLength(3)
      expect(result.organizations[0].role).toBe('owner')
      expect(result.organizations[1].role).toBe('admin')
      expect(result.organizations[2].role).toBe('member')
    })
  })
})
