import type { CustomConfigService } from '@vyrak/custom-config'

import * as jose from 'jose'

export interface JwtPayload {
  sub: string
  email: string
  iat?: number
  exp?: number
}

export class JwtProvider {
  private readonly secret: Uint8Array
  private readonly algorithm = 'HS256'
  private readonly expiresIn: string

  constructor(config: CustomConfigService) {
    const secretKey = config.jwt.secret
    this.secret = new TextEncoder().encode(secretKey)
    this.expiresIn = config.jwt.expiry
  }

  async sign(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
    const jwt = await new jose.SignJWT({
      sub: payload.sub,
      email: payload.email,
    })
      .setProtectedHeader({ alg: this.algorithm })
      .setIssuedAt()
      .setExpirationTime(this.expiresIn)
      .sign(this.secret)

    return jwt
  }

  async verify(token: string): Promise<JwtPayload> {
    try {
      const { payload } = await jose.jwtVerify(token, this.secret, {
        algorithms: [this.algorithm],
      })

      return {
        sub: payload.sub as string,
        email: payload.email as string,
        iat: payload.iat,
        exp: payload.exp,
      }
    } catch (_error) {
      throw new Error('Invalid or expired token')
    }
  }

  async extractUserId(token: string): Promise<string> {
    const payload = await this.verify(token)
    return payload.sub
  }
}
