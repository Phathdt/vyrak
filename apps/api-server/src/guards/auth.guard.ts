import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { auth } from '@vyrak/auth'

import { IS_PUBLIC_KEY } from './decorators'

/**
 * Guard to verify user authentication via Better Auth session
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

    const request = context.switchToHttp().getRequest()

    try {
      // Get session from Better Auth
      const session = await auth.api.getSession({
        headers: request.headers as Record<string, string>,
      })

      if (!session?.user) {
        throw new UnauthorizedException('Authentication required')
      }

      // Attach user and session to request
      request.user = session.user
      request.session = session

      return true
    } catch (_error) {
      throw new UnauthorizedException('Invalid or expired session')
    }
  }
}
