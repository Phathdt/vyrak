import { describe, expect, it } from 'vitest'

import { JwtStrategy } from './jwt.strategy'

import type { IConfigService } from '@vyrak/custom-config'

function createConfig(overrides?: { secret?: string }): IConfigService {
  return {
    jwt: {
      secret: overrides?.secret ?? 'test-secret-key',
      expiry: '1h',
    },
  } as unknown as IConfigService
}

// passport-jwt stores the resolved signing key behind this provider callback.
function resolveSecretKey(strategy: JwtStrategy): Promise<string> {
  return new Promise((resolve, reject) => {
    ;(strategy as any)._secretOrKeyProvider({}, 'any-token', (error: Error | null, secret: string) => {
      if (error) {
        reject(error)
        return
      }
      resolve(secret)
    })
  })
}

describe('JwtStrategy', () => {
  describe('constructor', () => {
    it('configures the strategy with the secret from IConfigService', async () => {
      const strategy = new JwtStrategy(createConfig({ secret: 'configured-secret' }))

      await expect(resolveSecretKey(strategy)).resolves.toBe('configured-secret')
    })

    it('disables expiration bypass', () => {
      const strategy = new JwtStrategy(createConfig())

      expect((strategy as any)._verifOpts.ignoreExpiration).toBe(false)
    })

    it('registers a request extractor', () => {
      const strategy = new JwtStrategy(createConfig())

      expect(typeof (strategy as any)._jwtFromRequest).toBe('function')
    })

    it('extracts the token from a bearer Authorization header', () => {
      const strategy = new JwtStrategy(createConfig())
      const extract = (strategy as any)._jwtFromRequest

      const request = { headers: { authorization: 'Bearer abc.def.ghi' } }

      expect(extract(request)).toBe('abc.def.ghi')
      expect(extract({ headers: {} })).toBeNull()
    })

    it('throws when the JWT config block is absent', () => {
      expect(() => new JwtStrategy({} as IConfigService)).toThrow()
    })
  })

  describe('validate', () => {
    it('maps the JWT subject and email into the request user shape', async () => {
      const strategy = new JwtStrategy(createConfig())

      const user = await strategy.validate({
        sub: 'user-1',
        email: 'user@example.com',
        iat: 1_700_000_000,
        exp: 1_700_003_600,
      })

      expect(user).toEqual({ userId: 'user-1', email: 'user@example.com' })
    })

    it('ignores extra claims on the payload', async () => {
      const strategy = new JwtStrategy(createConfig())

      const user = await strategy.validate({
        sub: 'user-2',
        email: 'other@example.com',
        roles: ['admin'],
      } as any)

      expect(user).toEqual({ userId: 'user-2', email: 'other@example.com' })
    })
  })
})
