import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { auth, AuthService } from '@vyrak/auth'

import { AuthController } from './auth.controller'

// Mock Better Auth
vi.mock('@vyrak/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
    handler: vi.fn(),
  },
  AuthService: vi.fn(),
}))

describe('AuthController', () => {
  let controller: AuthController
  let service: AuthService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            handleUserOnboarding: vi.fn(),
            getCurrentUser: vi.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get(AuthController)
    service = module.get(AuthService)
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
          {
            role: 'member',
            organization: {
              id: 'org-2',
              name: 'Org 2',
              slug: 'org-2',
            },
          },
        ],
      }

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(service.handleUserOnboarding).mockResolvedValue(undefined)
      vi.mocked(service.getCurrentUser).mockResolvedValue(mockUserData as any)

      const mockRequest = {
        headers: { authorization: 'Bearer token' },
      }

      const result = await controller.getCurrentUser(mockRequest as any)

      expect(result).toEqual({
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://example.com/avatar.jpg',
        },
        organizations: [
          {
            id: 'org-1',
            name: 'Org 1',
            slug: 'org-1',
            role: 'owner',
          },
          {
            id: 'org-2',
            name: 'Org 2',
            slug: 'org-2',
            role: 'member',
          },
        ],
      })

      expect(service.handleUserOnboarding).toHaveBeenCalledWith('user-123')
      expect(service.getCurrentUser).toHaveBeenCalledWith('user-123')
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

      expect(service.handleUserOnboarding).not.toHaveBeenCalled()
      expect(service.getCurrentUser).not.toHaveBeenCalled()
    })

    it('should call handleUserOnboarding after getting session', async () => {
      const mockSession = {
        user: {
          id: 'user-456',
          name: 'New User',
          email: 'new@example.com',
        },
      }

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(service.handleUserOnboarding).mockResolvedValue(undefined)
      vi.mocked(service.getCurrentUser).mockResolvedValue({
        id: 'user-456',
        name: 'New User',
        email: 'new@example.com',
        members: [],
      } as any)

      const mockRequest = {
        headers: { authorization: 'Bearer token' },
      }

      await controller.getCurrentUser(mockRequest as any)

      expect(service.handleUserOnboarding).toHaveBeenCalledWith('user-456')
      expect(service.getCurrentUser).toHaveBeenCalledWith('user-456')
    })

    it('should handle user without image gracefully', async () => {
      const mockSession = {
        user: {
          id: 'user-789',
          name: 'User Without Image',
          email: 'noimage@example.com',
          image: null,
        },
      }

      const mockUserData = {
        id: 'user-789',
        name: 'User Without Image',
        email: 'noimage@example.com',
        image: null,
        members: [],
      }

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(service.handleUserOnboarding).mockResolvedValue(undefined)
      vi.mocked(service.getCurrentUser).mockResolvedValue(mockUserData as any)

      const mockRequest = {
        headers: { authorization: 'Bearer token' },
      }

      const result = await controller.getCurrentUser(mockRequest as any)

      expect(result.user?.image).toBeNull()
      expect(result.organizations).toEqual([])
    })
  })

  describe('handleAuth', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should pass request to auth handler', async () => {
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

    it('should handle auth handler errors', async () => {
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
        setHeader: vi.fn(),
        json: vi.fn().mockReturnThis(),
        headersSent: false,
      }

      await controller.handleAuth(mockRequest as any, mockResponse as any)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication error' })
    })
  })
})
