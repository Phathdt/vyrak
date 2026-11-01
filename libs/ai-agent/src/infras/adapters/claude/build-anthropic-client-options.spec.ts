import { AnthropicAuthScheme } from '@vyrak/custom-config'
import { describe, expect, it } from 'vitest'

import { buildAnthropicClientOptions } from './build-anthropic-client-options'

describe('buildAnthropicClientOptions', () => {
  it('uses X-Api-Key auth by default', () => {
    expect(
      buildAnthropicClientOptions({
        apiKey: 'sk-test',
        apiUrl: 'http://192.168.1.16:5555',
      })
    ).toEqual({
      apiKey: 'sk-test',
      baseURL: 'http://192.168.1.16:5555/v1',
    })
  })

  it('uses Authorization Bearer when authScheme is bearer', () => {
    expect(
      buildAnthropicClientOptions({
        apiKey: 'sk-test',
        apiUrl: 'http://192.168.1.16:5555/',
        authScheme: AnthropicAuthScheme.BEARER,
      })
    ).toEqual({
      apiKey: null,
      authToken: 'sk-test',
      baseURL: 'http://192.168.1.16:5555/v1',
    })
  })
})
