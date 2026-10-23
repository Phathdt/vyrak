export function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
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
