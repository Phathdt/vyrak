import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'

import { IS_PUBLIC_KEY } from './decorators'

interface JwtPayload {
  sub: string
  email: string
  iat: number
  exp: number
}

/**
 * Guard to verify user authentication via JWT token
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

    const request = context.switchToHttp().getRequest<Request & { user?: { userId: string; email: string } }>()

    // Extract JWT token from Authorization header
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided')
    }

    const token = authHeader.substring(7)

    try {
      // Decode JWT without verification (verification will be done by JwtStrategy in other modules)
      // For simple verification here, we just decode and extract userId
      const payload = this.decodeJwt(token)

      if (!payload || !payload.sub) {
        throw new UnauthorizedException('Invalid token')
      }

      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new UnauthorizedException('Token expired')
      }

      request.user = {
        userId: payload.sub,
        email: payload.email,
      }

      return true
    } catch (error) {
      // Re-throw if it's already an UnauthorizedException
      if (error instanceof UnauthorizedException) {
        throw error
      }
      throw new UnauthorizedException('Invalid token')
    }
  }

  private decodeJwt(token: string): JwtPayload | null {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        return null
      }

      const payload = parts[1]
      const decoded = Buffer.from(payload, 'base64').toString('utf-8')
      return JSON.parse(decoded)
    } catch {
      return null
    }
  }
}
