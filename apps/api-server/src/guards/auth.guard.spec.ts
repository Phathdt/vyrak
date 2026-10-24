import { UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { auth } from '@vyrak/auth'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthGuard } from './auth.guard'
import { IS_PUBLIC_KEY } from './decorators'

// Mock Better Auth
vi.mock('@vyrak/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

describe('AuthGuard', () => {
  let guard: AuthGuard
  let reflector: Reflector

  beforeEach(() => {
    reflector = new Reflector()
    guard = new AuthGuard(reflector)
    vi.clearAllMocks()
  })

  const createMockContext = (headers: Record<string, string> = {}) => {
    const request = {
      headers,
      user: undefined,
      session: undefined,
    }

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: vi.fn(),
      getClass: vi.fn(),
    } as any
  }

  describe('canActivate', () => {
    it('should allow access for public routes', async () => {
      const context = createMockContext()
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true)

      const result = await guard.canActivate(context)

      expect(result).toBe(true)
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
      expect(auth.api.getSession).not.toHaveBeenCalled()
    })

    it('should allow access with valid session', async () => {
      const context = createMockContext({
        authorization: 'Bearer valid-token',
      })
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
        session: {
          token: 'valid-token',
          expiresAt: new Date(),
        },
      }

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession)

      const result = await guard.canActivate(context)
      const request = context.switchToHttp().getRequest()

      expect(result).toBe(true)
      expect(request.user).toEqual(mockSession.user)
      expect(request.session).toEqual(mockSession)
    })

    it('should throw UnauthorizedException if no session found', async () => {
      const context = createMockContext({
        authorization: 'Bearer invalid-token',
      })
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException if session has no user', async () => {
      const context = createMockContext({
        authorization: 'Bearer token-no-user',
      })
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: null,
      } as any)

      await expect(guard.canActivate(context)).rejects.toThrow('Authentication required')
    })

    it('should throw UnauthorizedException if getSession throws error', async () => {
      const context = createMockContext({
        authorization: 'Bearer expired-token',
      })
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

      vi.mocked(auth.api.getSession).mockRejectedValue(new Error('Session expired'))

      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired session')
    })

    it('should work without authorization header', async () => {
      const context = createMockContext({})
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)

      expect(auth.api.getSession).toHaveBeenCalledWith({
        headers: {},
      })
    })
  })
})
