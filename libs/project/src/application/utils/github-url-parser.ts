import { InvalidRepositoryUrlError } from '../../domain/exceptions'

/**
 * Parsed GitHub repository identifier.
 */
export interface ParsedGitHubRepository {
  owner: string
  repo: string
}

/**
 * Parses GitHub repository URLs into owner/repo components.
 *
 * Supports formats:
 * - HTTPS: https://github.com/owner/repo or https://github.com/owner/repo.git
 * - SSH: git@github.com:owner/repo.git
 * - Shorthand: owner/repo
 */
export class GitHubUrlParser {
  private static readonly HTTPS_PATTERN = /^https:\/\/github\.com\/([^/]+)\/([^/.]+?)(\.git)?$/
  private static readonly SSH_PATTERN = /^git@github\.com:([^/]+)\/([^/.]+?)(\.git)?$/
  private static readonly SHORTHAND_PATTERN = /^([^/]+)\/([^/.]+)$/

  /**
   * Parse a GitHub repository URL.
   *
   * @param url - GitHub repository URL in any supported format
   * @returns Parsed owner and repository name
   * @throws InvalidRepositoryUrlError if the URL cannot be parsed
   */
  parse(url: string): ParsedGitHubRepository {
    const trimmed = url.trim()

    // Try HTTPS pattern
    const httpsMatch = trimmed.match(GitHubUrlParser.HTTPS_PATTERN)
    if (httpsMatch) {
      return { owner: httpsMatch[1], repo: httpsMatch[2] }
    }

    // Try SSH pattern
    const sshMatch = trimmed.match(GitHubUrlParser.SSH_PATTERN)
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2] }
    }

    // Try shorthand pattern
    const shorthandMatch = trimmed.match(GitHubUrlParser.SHORTHAND_PATTERN)
    if (shorthandMatch) {
      return { owner: shorthandMatch[1], repo: shorthandMatch[2] }
    }

    throw new InvalidRepositoryUrlError(url)
  }
}
