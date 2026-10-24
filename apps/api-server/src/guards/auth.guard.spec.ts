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
    describe('public route bypass', () => {
      it('should allow access for public routes marked at method level', async () => {
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

      it('should allow access for public routes marked at class level', async () => {
        const context = createMockContext()
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true)

        const result = await guard.canActivate(context)

        expect(result).toBe(true)
        expect(auth.api.getSession).not.toHaveBeenCalled()
      })

      it('should bypass session validation for public routes even without headers', async () => {
        const context = createMockContext()
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true)

        const result = await guard.canActivate(context)

        expect(result).toBe(true)
        expect(auth.api.getSession).not.toHaveBeenCalled()
      })
    })

    describe('protected route authentication', () => {
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
        expect(auth.api.getSession).toHaveBeenCalledWith({
          headers: { authorization: 'Bearer valid-token' },
        })
      })

      it('should attach user object to request', async () => {
        const context = createMockContext({
          authorization: 'Bearer token',
        })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        const mockUser = {
          id: 'user-456',
          email: 'user@example.com',
        }
        const mockSession = {
          user: mockUser,
          session: { token: 'token', expiresAt: new Date() },
        }

        vi.mocked(auth.api.getSession).mockResolvedValue(mockSession)

        await guard.canActivate(context)
        const request = context.switchToHttp().getRequest()

        expect(request.user).toBeDefined()
        expect(request.user.id).toBe('user-456')
        expect(request.user.email).toBe('user@example.com')
      })

      it('should attach session object to request', async () => {
        const context = createMockContext({
          authorization: 'Bearer token',
        })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        const expiresAt = new Date()
        const mockSession = {
          user: { id: 'user-789', email: 'test@example.com' },
          session: { token: 'token', expiresAt },
        }

        vi.mocked(auth.api.getSession).mockResolvedValue(mockSession)

        await guard.canActivate(context)
        const request = context.switchToHttp().getRequest()

        expect(request.session).toBeDefined()
        expect(request.session.session.token).toBe('token')
        expect(request.session.session.expiresAt).toEqual(expiresAt)
      })
    })

    describe('error scenarios', () => {
      it('should throw UnauthorizedException if no session found', async () => {
        const context = createMockContext({
          authorization: 'Bearer invalid-token',
        })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockResolvedValue(null)

        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
        await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired session')
      })

      it('should throw UnauthorizedException if session has no user (undefined)', async () => {
        const context = createMockContext({
          authorization: 'Bearer token-no-user',
        })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockResolvedValue({
          user: undefined,
        } as any)

        await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired session')
      })

      it('should throw UnauthorizedException if session has null user', async () => {
        const context = createMockContext({
          authorization: 'Bearer token-null-user',
        })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockResolvedValue({
          user: null,
        } as any)

        await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired session')
      })

      it('should throw UnauthorizedException if getSession throws error', async () => {
        const context = createMockContext({
          authorization: 'Bearer expired-token',
        })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockRejectedValue(new Error('Session expired'))

        await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired session')
      })

      it('should throw UnauthorizedException if getSession throws any error', async () => {
        const context = createMockContext({
          authorization: 'Bearer malformed-token',
        })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockRejectedValue(new Error('Authentication failed'))

        await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException)
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

      it('should throw error with correct message on invalid session', async () => {
        const context = createMockContext()
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockRejectedValue(new Error('Invalid'))

        try {
          await guard.canActivate(context)
          expect.fail('Should have thrown')
        } catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedException)
          expect((error as UnauthorizedException).message).toBe('Invalid or expired session')
        }
      })
    })

    describe('reflector interaction', () => {
      it('should call reflector with handler and class context', async () => {
        const context = createMockContext()
        const reflectorSpy = vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true)

        await guard.canActivate(context)

        expect(reflectorSpy).toHaveBeenCalledWith(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])
      })

      it('should check IS_PUBLIC_KEY from reflector', async () => {
        const context = createMockContext()
        const reflectorSpy = vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true)

        await guard.canActivate(context)

        expect(reflectorSpy).toHaveBeenCalledWith(IS_PUBLIC_KEY, expect.any(Array))
      })

      it('should use getAllAndOverride method of reflector for protected routes', async () => {
        const context = createMockContext()
        const reflectorSpy = vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockResolvedValue({
          user: { id: 'user-1', email: 'test@example.com' },
        } as any)

        await guard.canActivate(context)

        expect(reflectorSpy).toHaveBeenCalled()
      })
    })

    describe('header handling', () => {
      it('should pass headers to getSession', async () => {
        const headers = {
          authorization: 'Bearer token123',
          'x-custom-header': 'value',
        }
        const context = createMockContext(headers)
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockResolvedValue({
          user: { id: 'user-1', email: 'test@example.com' },
        } as any)

        await guard.canActivate(context)

        expect(auth.api.getSession).toHaveBeenCalledWith({ headers })
      })

      it('should convert headers to Record<string, string>', async () => {
        const context = createMockContext({
          'content-type': 'application/json',
        })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockResolvedValue({
          user: { id: 'user-1', email: 'test@example.com' },
        } as any)

        await guard.canActivate(context)

        expect(auth.api.getSession).toHaveBeenCalledWith({
          headers: { 'content-type': 'application/json' },
        })
      })
    })
  })
})
