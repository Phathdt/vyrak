/**
 * @vitest-environment node
 */
import * as jose from 'jose'
import { describe, expect, it } from 'vitest'

import { JwtProvider } from './jwt.provider'

import type { IConfigService } from '@vyrak/custom-config'

function createConfig(overrides?: { secret?: string; expiry?: string }): IConfigService {
  return {
    jwt: {
      secret: overrides?.secret ?? 'test-secret-key',
      expiry: overrides?.expiry ?? '1h',
    },
  } as unknown as IConfigService
}

describe('JwtProvider', () => {
  describe('sign', () => {
    it('returns a token whose payload carries sub and email', async () => {
      const provider = new JwtProvider(createConfig())

      const token = await provider.sign({ sub: 'user-1', email: 'user@example.com' })
      const decoded = jose.decodeJwt(token)

      expect(decoded.sub).toBe('user-1')
      expect(decoded.email).toBe('user@example.com')
    })

    it('sets issued-at and expiration claims derived from the configured expiry', async () => {
      const provider = new JwtProvider(createConfig({ expiry: '2h' }))

      const token = await provider.sign({ sub: 'user-1', email: 'user@example.com' })
      const decoded = jose.decodeJwt(token)

      expect(decoded.iat).toBeTypeOf('number')
      expect(decoded.exp).toBeTypeOf('number')
      expect(decoded.exp! - decoded.iat!).toBe(2 * 60 * 60)
    })

    it('signs with HS256 and the configured secret', async () => {
      const provider = new JwtProvider(createConfig({ secret: 'another-secret' }))

      const token = await provider.sign({ sub: 'user-1', email: 'user@example.com' })
      const header = jose.decodeProtectedHeader(token)

      expect(header.alg).toBe('HS256')

      const secret = new TextEncoder().encode('another-secret')
      await expect(jose.jwtVerify(token, secret, { algorithms: ['HS256'] })).resolves.toBeDefined()
    })

    it('produces distinct tokens for distinct payloads', async () => {
      const provider = new JwtProvider(createConfig())

      const first = await provider.sign({ sub: 'user-1', email: 'a@example.com' })
      const second = await provider.sign({ sub: 'user-2', email: 'b@example.com' })

      expect(first).not.toBe(second)
      expect(jose.decodeJwt(first).sub).toBe('user-1')
      expect(jose.decodeJwt(second).sub).toBe('user-2')
    })
  })

  describe('verify', () => {
    it('round-trips a token signed by the same provider', async () => {
      const provider = new JwtProvider(createConfig())

      const token = await provider.sign({ sub: 'user-1', email: 'user@example.com' })
      const payload = await provider.verify(token)

      expect(payload.sub).toBe('user-1')
      expect(payload.email).toBe('user@example.com')
      expect(payload.iat).toBeTypeOf('number')
      expect(payload.exp).toBeTypeOf('number')
    })

    it('rejects a token signed with a different secret', async () => {
      const signer = new JwtProvider(createConfig({ secret: 'issuer-secret' }))
      const verifier = new JwtProvider(createConfig({ secret: 'other-secret' }))

      const token = await signer.sign({ sub: 'user-1', email: 'user@example.com' })

      await expect(verifier.verify(token)).rejects.toThrow('Invalid or expired token')
    })

    it('rejects an expired token', async () => {
      const provider = new JwtProvider(createConfig({ expiry: '-1s' }))

      const token = await provider.sign({ sub: 'user-1', email: 'user@example.com' })

      await expect(provider.verify(token)).rejects.toThrow('Invalid or expired token')
    })

    it('rejects a malformed token', async () => {
      const provider = new JwtProvider(createConfig())

      await expect(provider.verify('not-a-jwt')).rejects.toThrow('Invalid or expired token')
    })

    it('rejects a token using an unexpected algorithm', async () => {
      const provider = new JwtProvider(createConfig({ secret: 'test-secret-key' }))
      const secret = new TextEncoder().encode('test-secret-key')

      const token = await new jose.SignJWT({ sub: 'user-1', email: 'user@example.com' })
        .setProtectedHeader({ alg: 'HS512' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(secret)

      await expect(provider.verify(token)).rejects.toThrow('Invalid or expired token')
    })
  })

  describe('extractUserId', () => {
    it('returns the subject of a valid token', async () => {
      const provider = new JwtProvider(createConfig())

      const token = await provider.sign({ sub: 'user-42', email: 'user@example.com' })

      await expect(provider.extractUserId(token)).resolves.toBe('user-42')
    })

    it('propagates the verification failure for an invalid token', async () => {
      const provider = new JwtProvider(createConfig())

      await expect(provider.extractUserId('bogus')).rejects.toThrow('Invalid or expired token')
    })
  })

  describe('constructor', () => {
    it('throws when the JWT config block is absent', () => {
      expect(() => new JwtProvider({} as IConfigService)).toThrow()
    })
  })
})
