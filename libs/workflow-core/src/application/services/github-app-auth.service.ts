import type {
  IGitHubAppTokenCache,
  IGitHubAppTokenGenerator,
  IGitHubAuthService,
} from '../../domain/interfaces/github-auth.interface'

/**
 * GitHub App authentication service that orchestrates token generation and caching.
 *
 * Flow:
 * 1. Check cache for existing token
 * 2. If cache hit, return cached token (fast path)
 * 3. If cache miss, generate new token via GitHub API
 * 4. Store generated token in cache with 50-minute TTL
 * 5. Return generated token
 *
 * Plain TypeScript class (no @Injectable) - registered via DI tokens in module.
 */
export class GitHubAppAuthService implements IGitHubAuthService {
  private static readonly CACHE_TTL_SECONDS = 3000 // 50 minutes

  constructor(
    private readonly generator: IGitHubAppTokenGenerator,
    private readonly cache: IGitHubAppTokenCache
  ) {}

  /**
   * Get an installation access token for the GitHub App.
   * Returns cached token if available, otherwise generates a new one.
   *
   * @param installationId - GitHub App installation ID
   * @returns Installation access token (valid for 1 hour)
   * @throws {GitHubAuthError} when token generation fails
   */
  async getToken(installationId: number): Promise<string> {
    // Try cache first (fast path)
    try {
      const cachedToken = await this.cache.get(installationId)
      if (cachedToken) {
        return cachedToken
      }
    } catch (error) {
      // Cache failure is non-fatal, fall through to generation
      console.warn(`Cache read failed for installation ${installationId}, generating token:`, error)
    }

    // Cache miss or failure: generate new token
    const token = await this.generator.generate(installationId)

    // Store in cache for future requests
    try {
      await this.cache.set(installationId, token, GitHubAppAuthService.CACHE_TTL_SECONDS)
    } catch (error) {
      // Cache write failure is non-fatal, token is still valid
      console.warn(`Cache write failed for installation ${installationId}:`, error)
    }

    return token
  }
}
