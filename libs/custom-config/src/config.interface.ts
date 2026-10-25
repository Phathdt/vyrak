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

export interface AppConfig {
  host: HostConfig
  database: DatabaseConfig
  redis: RedisConfig
  log: LogConfig
  workspace: WorkspaceConfig
  [key: string]: unknown
}
