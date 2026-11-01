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

/**
 * Interface for configuration service.
 * Use this interface for dependency injection to enable easier testing and mocking.
 *
 * @example
 * ```typescript
 * // In your service
 * export class WorkflowService {
 *   constructor(
 *     private readonly config: IConfigService
 *   ) {}
 *
 *   someMethod() {
 *     const dbUrl = this.config.database.url
 *     const port = this.config.get<number>('host.port')
 *   }
 * }
 *
 * // In tests
 * const mockConfig: IConfigService = {
 *   get: vi.fn(),
 *   database: { url: 'postgresql://test' },
 *   host: { port: 3000 },
 *   // ... other required properties
 * }
 * const service = new WorkflowService(mockConfig)
 * ```
 */
export interface IConfigService {
  /**
   * Get configuration value by dot-notation path
   * @param key - Dot-notation path (e.g., 'database.url')
   * @returns Configuration value or undefined if not found
   */
  get<T = unknown>(key: string): T

  // Config properties (readonly to prevent accidental mutations)
  readonly host: HostConfig
  readonly database: DatabaseConfig
  readonly redis: RedisConfig
  readonly log: LogConfig
  readonly workspace: WorkspaceConfig
  readonly agentRuntime: AgentRuntimeConfig
  readonly jwt: JwtConfig
  readonly s3: S3Config
  readonly anthropic?: AnthropicConfig
  readonly frontendUrl: string
}
