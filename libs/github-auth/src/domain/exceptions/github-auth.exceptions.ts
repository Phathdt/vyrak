/**
 * Base error for GitHub authentication failures.
 */
export class GitHubAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Thrown when GitHub App configuration is invalid or incomplete.
 */
export class GitHubAppConfigError extends GitHubAuthError {
  constructor(message: string) {
    super(`GitHub App configuration error: ${message}`)
  }
}

/**
 * Thrown when installation access token generation fails.
 */
export class GitHubTokenGenerationError extends GitHubAuthError {
  constructor(
    public readonly installationId: number,
    message: string
  ) {
    super(`Failed to generate token for installation ${installationId}: ${message}`)
  }
}

/**
 * Thrown when token cache operations fail.
 */
export class GitHubTokenCacheError extends GitHubAuthError {
  constructor(message: string) {
    super(`Token cache error: ${message}`)
  }
}
