import { AnthropicAuthScheme } from '@vyrak/custom-config'

import type Anthropic from '@anthropic-ai/sdk'
import type { AnthropicConfig } from '@vyrak/custom-config'

export function buildAnthropicClientOptions(
  anthropic: Pick<AnthropicConfig, 'apiKey' | 'apiUrl' | 'authScheme'>
): NonNullable<ConstructorParameters<typeof Anthropic>[0]> {
  const baseURL = anthropic.apiUrl ? `${anthropic.apiUrl.replace(/\/$/, '')}/v1` : undefined
  const authScheme = anthropic.authScheme ?? AnthropicAuthScheme.X_API_KEY

  if (authScheme === AnthropicAuthScheme.BEARER) {
    return {
      apiKey: null,
      authToken: anthropic.apiKey,
      baseURL,
    }
  }

  return {
    apiKey: anthropic.apiKey,
    baseURL,
  }
}
