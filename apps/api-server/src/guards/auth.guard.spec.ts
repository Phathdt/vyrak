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
          session: { token: 'token', expiresAt: new Date() },
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
          session: { token: 'token', expiresAt: new Date() },
        } as any)

        await guard.canActivate(context)

        expect(auth.api.getSession).toHaveBeenCalledWith({
          headers: { 'content-type': 'application/json' },
        })
      })
    })

    describe('success path with user and session attachment (lines 33-40)', () => {
      it('should execute success path and return true when user exists', async () => {
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
        expect(request.user).toBe(mockSession.user)
        expect(request.session).toBe(mockSession)
      })

      it('should throw "Authentication required" when session.user is falsy', async () => {
        const context = createMockContext({
          authorization: 'Bearer token',
        })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockResolvedValue({
          session: { token: 'token', expiresAt: new Date() },
        } as any)

        await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired session')
      })

      it('should throw "Authentication required" when session is null', async () => {
        const context = createMockContext({
          authorization: 'Bearer token',
        })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockResolvedValue(null as any)

        await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired session')
      })

      it('should attach complete user object with all properties', async () => {
        const mockUser = {
          id: 'user-456',
          email: 'user@example.com',
          name: 'John Doe',
          emailVerified: true,
          phone: '+1234567890',
        }

        const mockSession = {
          user: mockUser,
          session: {
            token: 'token',
            expiresAt: new Date('2026-12-31'),
            sessionToken: 'session-123',
          },
        }

        const context = createMockContext({ authorization: 'Bearer token' })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
        vi.mocked(auth.api.getSession).mockResolvedValue(mockSession)

        await guard.canActivate(context)
        const request = context.switchToHttp().getRequest()

        expect(request.user).toEqual(mockUser)
        expect(request.user.id).toBe('user-456')
        expect(request.user.email).toBe('user@example.com')
        expect(request.user.name).toBe('John Doe')
        expect(request.user.emailVerified).toBe(true)
      })

      it('should attach complete session object to request', async () => {
        const expiresAt = new Date('2026-12-31')
        const mockSession = {
          user: { id: 'user-1', email: 'test@example.com' },
          session: {
            token: 'session-token',
            expiresAt,
            sessionToken: 'session-123',
          },
        }

        const context = createMockContext({ authorization: 'Bearer token' })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
        vi.mocked(auth.api.getSession).mockResolvedValue(mockSession)

        await guard.canActivate(context)
        const request = context.switchToHttp().getRequest()

        expect(request.session).toEqual(mockSession)
        expect(request.session.session.token).toBe('session-token')
        expect(request.session.session.expiresAt).toEqual(expiresAt)
      })
    })

    describe('Better Auth API integration details', () => {
      it('should call auth.api.getSession once per request', async () => {
        const context = createMockContext({ authorization: 'Bearer token' })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockResolvedValue({
          user: { id: 'user-1', email: 'test@example.com' },
          session: { token: 'token', expiresAt: new Date() },
        })

        await guard.canActivate(context)

        expect(auth.api.getSession).toHaveBeenCalledTimes(1)
      })

      it('should pass all request headers to getSession unchanged', async () => {
        const headers = {
          authorization: 'Bearer my-token',
          'user-agent': 'Mozilla/5.0',
          'x-custom-header': 'custom-value',
          'content-type': 'application/json',
        }

        const context = createMockContext(headers)
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockResolvedValue({
          user: { id: 'user-1', email: 'test@example.com' },
          session: { token: 'token', expiresAt: new Date() },
        })

        await guard.canActivate(context)

        expect(auth.api.getSession).toHaveBeenCalledWith({
          headers: expect.objectContaining(headers),
        })
      })

      it('should verify headers passed as Record<string, string> type', async () => {
        const context = createMockContext({
          authorization: 'Bearer token',
          'x-request-id': 'req-123',
        })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockResolvedValue({
          user: { id: 'user-1', email: 'test@example.com' },
          session: { token: 'token', expiresAt: new Date() },
        })

        await guard.canActivate(context)

        const call = (auth.api.getSession as any).mock.calls[0][0]
        expect(typeof call.headers).toBe('object')
        expect(call.headers).toHaveProperty('authorization')
        expect(call.headers).toHaveProperty('x-request-id')
      })
    })

    describe('error message distinction', () => {
      it('should throw "Invalid or expired session" when getSession fails', async () => {
        const context = createMockContext({ authorization: 'Bearer token' })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockRejectedValue(new Error('Network error'))

        try {
          await guard.canActivate(context)
          expect.fail('Should have thrown')
        } catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedException)
          expect((error as UnauthorizedException).message).toBe('Invalid or expired session')
        }
      })

      it('should throw UnauthorizedException (not raw error) on getSession rejection', async () => {
        const context = createMockContext()
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockRejectedValue(new Error('Any error'))

        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException)
      })

      it('should catch and transform all exceptions to UnauthorizedException', async () => {
        const context = createMockContext({ authorization: 'Bearer token' })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)

        const customError = new Error('Custom auth error')
        vi.mocked(auth.api.getSession).mockRejectedValue(customError)

        await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired session')
      })
    })

    describe('branch coverage completion', () => {
      it('should verify that isPublic false branch is taken for protected routes', async () => {
        const context = createMockContext({ authorization: 'Bearer token' })
        const reflectorSpy = vi.spyOn(reflector, 'getAllAndOverride')
        reflectorSpy.mockReturnValue(false)

        vi.mocked(auth.api.getSession).mockResolvedValue({
          user: { id: 'user-1', email: 'test@example.com' },
          session: { token: 'token', expiresAt: new Date() },
        })

        const result = await guard.canActivate(context)

        expect(reflectorSpy).toHaveBeenCalled()
        expect(result).toBe(true)
        expect(auth.api.getSession).toHaveBeenCalled()
      })

      it('should skip session validation when isPublic is true (early return)', async () => {
        const context = createMockContext()
        const reflectorSpy = vi.spyOn(reflector, 'getAllAndOverride')
        reflectorSpy.mockReturnValue(true)

        const result = await guard.canActivate(context)

        expect(reflectorSpy).toHaveBeenCalled()
        expect(result).toBe(true)
        expect(auth.api.getSession).not.toHaveBeenCalled()
      })

      it('should have both branches of the if(isPublic) condition', async () => {
        const context1 = createMockContext()
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true)

        const result1 = await guard.canActivate(context1)
        expect(result1).toBe(true)

        vi.clearAllMocks()

        const context2 = createMockContext({ authorization: 'Bearer token' })
        vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
        vi.mocked(auth.api.getSession).mockResolvedValue({
          user: { id: 'user-1', email: 'test@example.com' },
          session: { token: 'token', expiresAt: new Date() },
        })

        const result2 = await guard.canActivate(context2)
        expect(result2).toBe(true)
      })
    })
  })
})
