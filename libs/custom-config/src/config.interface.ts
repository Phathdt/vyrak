import type { S3Config } from './configs/s3.config'
import type { WorkspaceConfig } from './workspace.config'

export interface DatabaseConfig {
  url: string
}

export interface RedisConfig {
  url: string
}

export interface HostConfig {
  port: number
}

export interface LogConfig {
  level: string
  enableJsonFormat: boolean
}

export interface AgentRuntimeConfig {
  useFakeAgent: boolean
  claudeCliPath: string
}

export interface JwtConfig {
  secret: string
  expiry: string
}

export const AnthropicAuthScheme = {
  X_API_KEY: 'x-api-key',
  BEARER: 'bearer',
} as const

export type AnthropicAuthScheme = (typeof AnthropicAuthScheme)[keyof typeof AnthropicAuthScheme]

export interface AnthropicConfig {
  apiKey: string
  apiUrl?: string
  model: string
  /** How ANTHROPIC__API_KEY is sent. Default: x-api-key (Anthropic SDK). Use bearer for OpenAI-style proxies. */
  authScheme?: AnthropicAuthScheme
}

export interface AppConfig {
  host: HostConfig
  database: DatabaseConfig
  redis: RedisConfig
  log: LogConfig
  workspace: WorkspaceConfig
  agentRuntime: AgentRuntimeConfig
  jwt: JwtConfig
  s3: S3Config
  anthropic?: AnthropicConfig
  frontendUrl: string
  [key: string]: unknown
}
