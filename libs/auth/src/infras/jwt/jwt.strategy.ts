import { PassportStrategy } from '@nestjs/passport'

import { ExtractJwt, Strategy } from 'passport-jwt'

import type { JwtPayload } from './jwt.provider'

export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secretKey = process.env.JWT_SECRET || 'development-secret-key-please-change-in-production'

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secretKey,
    })
  }

  async validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email }
  }
}
