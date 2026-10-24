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

  const createMockContext = (isPublic = false): ExecutionContext => {
    const request = { userId: undefined }

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: vi.fn(),
      getClass: vi.fn(),
    } as any
  }

  describe('canActivate', () => {
    it('should allow access to public routes', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true)
      const context = createMockContext(true)

      const result = await guard.canActivate(context)

      expect(result).toBe(true)
    })

    it('should allow access to protected routes with mock userId', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
      const context = createMockContext(false)

      const result = await guard.canActivate(context)

      expect(result).toBe(true)

      const request = context.switchToHttp().getRequest()
      expect(request.userId).toBe('test-user-id')
    })

    it('should set mock userId on request', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
      const context = createMockContext(false)

      await guard.canActivate(context)

      const request = context.switchToHttp().getRequest()
      expect(request.userId).toBeDefined()
      expect(request.userId).toBe('test-user-id')
    })

    it('should check IS_PUBLIC_KEY metadata', async () => {
      const spy = vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
      const context = createMockContext(false)

      await guard.canActivate(context)

      expect(spy).toHaveBeenCalledWith(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])
    })
  })
})
