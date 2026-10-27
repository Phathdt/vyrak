/**
 * Mask sensitive token for display
 * NEVER log or expose actual token values
 */
export function maskToken(token?: string): string {
  if (!token) return ''
  return '••••••••••••••••'
}

/**
 * Sanitize error messages to remove tokens
 */
export function sanitizeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  // Remove any potential token patterns
  return message
    .replace(/ghp_[A-Za-z0-9]{36}/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/glpat-[A-Za-z0-9_-]{20,}/g, '[REDACTED_GITLAB_TOKEN]')
    .replace(/\b[A-Za-z0-9]{32,}\b/g, '[REDACTED_TOKEN]')
}
