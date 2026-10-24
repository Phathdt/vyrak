import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { Request } from 'express'

// import { auth } from '../auth/auth.config'
import { IS_PUBLIC_KEY } from './decorators'

/**
 * Guard to verify user authentication via Better Auth session
 * TODO Phase 3: Re-enable full auth integration
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest<Request & { userId?: string }>()

    // TODO Phase 3: Re-enable BetterAuth session check
    // For Phase 2 testing, use mock userId
    const mockUserId = 'test-user-id'
    request.userId = mockUserId

    return true
  }
}
