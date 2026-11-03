import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common'
import { WsException } from '@nestjs/websockets'
import { JWT_PROVIDER, JwtProvider } from '@vyrak/auth'
import { Socket } from 'socket.io'

/**
 * WebSocket authentication guard
 * Validates JWT token from socket handshake and attaches user data to socket
 *
 * SECURITY: Uses JwtProvider to VERIFY (not just decode) JWT tokens with signature validation
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(@Inject(JWT_PROVIDER) private readonly jwtProvider: JwtProvider) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient()

    try {
      // Get token from handshake auth or query
      const token = (client.handshake.auth?.token || client.handshake.query?.token) as string | undefined

      if (!token) {
        throw new WsException('Missing authentication token')
      }

      // VERIFY JWT with signature validation (CRITICAL FIX)
      const payload = await this.jwtProvider.verify(token)

      if (!payload.sub) {
        throw new WsException('Invalid token payload')
      }

      // Get orgId from handshake auth for tenant context
      const orgId = client.handshake.auth?.orgId as string | undefined

      if (!orgId) {
        throw new WsException('Missing organization ID')
      }

      // Attach user and tenant context to socket data
      client.data.userId = payload.sub
      client.data.email = payload.email
      client.data.orgId = orgId // Store orgId for tenant context
      client.data.user = {
        id: payload.sub,
        email: payload.email,
      }

      return true
    } catch (error) {
      console.error('WS Auth failed:', error)
      throw new WsException('Invalid or expired token')
    }
  }
}
