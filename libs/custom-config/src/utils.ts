export function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/**
 * Parses a Redis connection URL into the parts BullMQ expects.
 *
 * Every Redis consumer (EventBus, Socket.IO adapter, worker emitter) connects through
 * `redis.url`, so BullMQ must use the same URL instead of separate host/port variables.
 * Otherwise a job can reach the worker while its events are published to another Redis.
 */
export function parseRedisUrl(url: string): {
  host: string
  port: number
  password?: string
  username?: string
  db?: number
  tls?: Record<string, never>
} {
  const parsed = new URL(url)
  const password = parsed.password ? decodeURIComponent(parsed.password) : undefined
  const username = parsed.username ? decodeURIComponent(parsed.username) : undefined
  const dbSegment = parsed.pathname.replace(/^\//, '')
  const db = /^\d+$/.test(dbSegment) ? Number(dbSegment) : undefined

  return {
    host: parsed.hostname || 'localhost',
    port: parsed.port ? Number(parsed.port) : 6379,
    ...(password ? { password } : {}),
    ...(username ? { username } : {}),
    ...(db !== undefined ? { db } : {}),
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
  }
}

export function snakeToCamelCase(str: string): string {
  return str.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

export function convertToCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null ? convertToCamelCase(item as Record<string, unknown>) : item
    ) as unknown as Record<string, unknown>
  }

  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    const camelKey = snakeToCamelCase(key)
    const value = obj[key]
    result[camelKey] =
      typeof value === 'object' && value !== null ? convertToCamelCase(value as Record<string, unknown>) : value
  }
  return result
}
