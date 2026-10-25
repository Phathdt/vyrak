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

export interface AppConfig {
  host: HostConfig
  database: DatabaseConfig
  redis: RedisConfig
  log: LogConfig
  workspace: WorkspaceConfig
  agentRuntime: AgentRuntimeConfig
  jwt: JwtConfig
  frontendUrl: string
  [key: string]: unknown
}
