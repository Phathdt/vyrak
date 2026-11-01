import { AnthropicAuthScheme } from '@vyrak/custom-config'
import { describe, expect, it } from 'vitest'

import { buildAnthropicClientOptions } from './build-anthropic-client-options'

describe('buildAnthropicClientOptions', () => {
  it('uses X-Api-Key auth by default', () => {
    expect(
      buildAnthropicClientOptions({
        apiKey: 'sk-test',
        apiUrl: 'http://localhost:20128',
      })
    ).toEqual({
      apiKey: 'sk-test',
      baseURL: 'http://localhost:20128/v1',
    })
  })

  it('uses Authorization Bearer when authScheme is bearer', () => {
    expect(
      buildAnthropicClientOptions({
        apiKey: 'sk-test',
        apiUrl: 'http://localhost:20128/',
        authScheme: AnthropicAuthScheme.BEARER,
      })
    ).toEqual({
      apiKey: null,
      authToken: 'sk-test',
      baseURL: 'http://localhost:20128/v1',
    })
  })
})
