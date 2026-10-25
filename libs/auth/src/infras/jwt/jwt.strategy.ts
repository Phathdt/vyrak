import { PassportStrategy } from '@nestjs/passport'
import type { CustomConfigService } from '@vyrak/custom-config'

import { ExtractJwt, Strategy } from 'passport-jwt'

import type { JwtPayload } from './jwt.provider'

export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: CustomConfigService) {
    const secretKey = config.jwt.secret

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
