import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthGuard } from './auth.guard'
import { IS_PUBLIC_KEY } from './decorators'

describe('AuthGuard (Organizations)', () => {
  let guard: AuthGuard
  let reflector: Reflector

  beforeEach(() => {
    reflector = new Reflector()
    guard = new AuthGuard(reflector)
  })

  const createMockContext = (isPublic = false, token?: string): ExecutionContext => {
    const request = {
      userId: undefined,
      headers: {
        authorization: token ? `Bearer ${token}` : undefined,
      },
    }

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: vi.fn(),
      getClass: vi.fn(),
    } as any
  }

  const createValidToken = (payload: any): string => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64')
    const body = Buffer.from(JSON.stringify(payload)).toString('base64')
    const signature = 'mock-signature'
    return `${header}.${body}.${signature}`
  }

  describe('canActivate', () => {
    it('should allow access to public routes', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true)
      const context = createMockContext(true)

      const result = await guard.canActivate(context)

      expect(result).toBe(true)
    })

    it('should allow access to protected routes with valid token', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
      const token = createValidToken({
        sub: 'test-user-id',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
      const context = createMockContext(false, token)

      const result = await guard.canActivate(context)

      expect(result).toBe(true)

      const request = context.switchToHttp().getRequest()
      expect(request.userId).toBe('test-user-id')
    })

    it('should set userId on request with valid token', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
      const token = createValidToken({
        sub: 'test-user-id',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
      const context = createMockContext(false, token)

      await guard.canActivate(context)

      const request = context.switchToHttp().getRequest()
      expect(request.userId).toBeDefined()
      expect(request.userId).toBe('test-user-id')
    })

    it('should check IS_PUBLIC_KEY metadata', async () => {
      const spy = vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
      const token = createValidToken({
        sub: 'test-user-id',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
      const context = createMockContext(false, token)

      await guard.canActivate(context)

      expect(spy).toHaveBeenCalledWith(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])
    })

    it('should throw UnauthorizedException when no token provided', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
      const context = createMockContext(false)

      await expect(guard.canActivate(context)).rejects.toThrow('No token provided')
    })

    it('should throw UnauthorizedException when token is invalid', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
      const context = createMockContext(false, 'invalid-token')

      await expect(guard.canActivate(context)).rejects.toThrow('Invalid token')
    })

    it('should throw UnauthorizedException when token is expired', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
      const token = createValidToken({
        sub: 'test-user-id',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
      })
      const context = createMockContext(false, token)

      await expect(guard.canActivate(context)).rejects.toThrow('Token expired')
    })
  })
})
