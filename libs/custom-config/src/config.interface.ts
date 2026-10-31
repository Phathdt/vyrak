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

export interface AnthropicConfig {
  apiKey: string
  apiUrl?: string
  model: string
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
  anthropic: AnthropicConfig
  frontendUrl: string
  [key: string]: unknown
}
