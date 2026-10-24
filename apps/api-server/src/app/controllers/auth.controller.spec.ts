import { auth } from '@vyrak/auth'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthController } from './auth.controller'

// Mock Better Auth BEFORE importing from @vyrak/auth
vi.mock('@vyrak/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
    handler: vi.fn(),
  },
  AuthService: vi.fn(() => ({
    handleUserOnboarding: vi.fn(),
    getCurrentUser: vi.fn(),
  })),
}))

describe('AuthController', () => {
  let controller: AuthController
  let mockAuthService: any

  beforeEach(() => {
    mockAuthService = {
      handleUserOnboarding: vi.fn(),
      getCurrentUser: vi.fn(),
    }

    controller = new AuthController(mockAuthService)
    vi.clearAllMocks()
  })

  describe('getCurrentUser', () => {
    it('should return user with organizations when session exists', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://example.com/avatar.jpg',
        },
      }

      const mockUserData = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.jpg',
        members: [
          {
            role: 'owner',
            organization: {
              id: 'org-1',
              name: 'Org 1',
              slug: 'org-1',
            },
          },
        ],
      }

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      mockAuthService.handleUserOnboarding.mockResolvedValue(undefined)
      mockAuthService.getCurrentUser.mockResolvedValue(mockUserData)

      const mockRequest = {
        headers: { authorization: 'Bearer token' },
      }

      const result = await controller.getCurrentUser(mockRequest as any)

      expect(result.user).toEqual({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.jpg',
      })
      expect(result.organizations).toHaveLength(1)
      expect(mockAuthService.handleUserOnboarding).toHaveBeenCalledWith('user-123')
    })

    it('should return empty user and organizations when no session', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      const mockRequest = {
        headers: {},
      }

      const result = await controller.getCurrentUser(mockRequest as any)

      expect(result).toEqual({
        user: null,
        organizations: [],
      })
      expect(mockAuthService.handleUserOnboarding).not.toHaveBeenCalled()
    })

    it('should call getCurrentUser after handleUserOnboarding', async () => {
      const mockSession = {
        user: {
          id: 'user-456',
          name: 'New User',
          email: 'new@example.com',
          image: null,
        },
      }

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      mockAuthService.handleUserOnboarding.mockResolvedValue(undefined)
      mockAuthService.getCurrentUser.mockResolvedValue({
        id: 'user-456',
        name: 'New User',
        email: 'new@example.com',
        members: [],
      })

      const mockRequest = {
        headers: { authorization: 'Bearer token' },
      }

      await controller.getCurrentUser(mockRequest as any)

      expect(mockAuthService.handleUserOnboarding).toHaveBeenCalledWith('user-456')
      expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith('user-456')
    })
  })

  describe('handleAuth', () => {
    it('should call auth.handler with proper request format', async () => {
      const mockTextResponse = async () => '{"user":{"id":"123"}}'
      const mockWebResponse = {
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: mockTextResponse,
      }

      vi.mocked(auth.handler).mockResolvedValue(mockWebResponse as any)

      const mockRequest = {
        method: 'POST',
        url: '/api/auth/sign-up/email',
        protocol: 'http',
        get: vi.fn().mockReturnValue('localhost:3000'),
        headers: { 'content-type': 'application/json' },
        body: { email: 'test@example.com' },
      }

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        headersSent: false,
      }

      await controller.handleAuth(mockRequest as any, mockResponse as any)

      expect(auth.handler).toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(200)
    })

    it('should handle errors from auth.handler', async () => {
      vi.mocked(auth.handler).mockRejectedValue(new Error('Auth error'))

      const mockRequest = {
        method: 'GET',
        url: '/api/auth/session',
        protocol: 'http',
        get: vi.fn().mockReturnValue('localhost:3000'),
        headers: {},
        body: null,
      }

      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        headersSent: false,
      }

      await controller.handleAuth(mockRequest as any, mockResponse as any)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication error' })
    })

    it('should not send headers if already sent', async () => {
      vi.mocked(auth.handler).mockRejectedValue(new Error('Error'))

      const mockRequest = {
        method: 'GET',
        url: '/api/auth/session',
        protocol: 'http',
        get: vi.fn().mockReturnValue('localhost:3000'),
        headers: {},
        body: null,
      }

      const mockResponse = {
        status: vi.fn(),
        json: vi.fn(),
        headersSent: true,
      }

      await controller.handleAuth(mockRequest as any, mockResponse as any)

      expect(mockResponse.status).not.toHaveBeenCalled()
      expect(mockResponse.json).not.toHaveBeenCalled()
    })
  })
})
