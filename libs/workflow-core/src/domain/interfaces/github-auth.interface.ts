/**
 * GitHub authentication service for generating installation access tokens.
 * Used by RepoCacheService to authenticate git operations with GitHub App.
 */
export interface IGitHubAuthService {
  /**
   * Get an installation access token for the GitHub App.
   * Returns cached token if available, otherwise generates a new one.
   *
   * @param installationId - GitHub App installation ID
   * @returns Installation access token (valid for 1 hour)
   * @throws {GitHubAuthError} when token generation fails
   */
  getToken(installationId: number): Promise<string>
}

/**
 * Low-level token generator that communicates with GitHub API.
 * Wrapped by IGitHubAuthService for caching.
 */
export interface IGitHubAppTokenGenerator {
  /**
   * Generate a new installation access token from GitHub API.
   *
   * @param installationId - GitHub App installation ID
   * @returns Fresh installation access token
   * @throws {GitHubAuthError} when API call fails
   */
  generate(installationId: number): Promise<string>
}

/**
 * Token cache abstraction (implementation uses Redis).
 */
export interface IGitHubAppTokenCache {
  /**
   * Get cached token for installation.
   *
   * @param installationId - GitHub App installation ID
   * @returns Cached token or null if not found/expired
   */
  get(installationId: number): Promise<string | null>

  /**
   * Cache a token with TTL.
   *
   * @param installationId - GitHub App installation ID
   * @param token - Installation access token
   * @param ttlSeconds - Time to live in seconds (typically 3000 = 50 minutes)
   */
  set(installationId: number, token: string, ttlSeconds: number): Promise<void>
}
