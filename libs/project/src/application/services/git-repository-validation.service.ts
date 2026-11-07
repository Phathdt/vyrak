import { Octokit } from '@octokit/rest'

import { GitHubRepositoryNotFoundError, RepositoryAccessDeniedError } from '../../domain/exceptions'
import { GitHubUrlParser } from '../utils/github-url-parser'

import type { IGitHubAuthService } from '@vyrak/workflow-core'

/**
 * Metadata returned from GitHub API validation.
 */
export interface GitHubRepositoryMetadata {
  owner: string
  repo: string
  defaultBranch: string
  isPrivate: boolean
}

/**
 * Service to validate GitHub repository access using GitHub App authentication.
 */
export class GitRepositoryValidationService {
  private readonly urlParser = new GitHubUrlParser()

  constructor(private readonly githubAuthService: IGitHubAuthService) {}

  /**
   * Validate that the GitHub App has access to the specified repository.
   *
   * @param url - GitHub repository URL
   * @returns Repository metadata from GitHub API
   * @throws InvalidRepositoryUrlError if URL cannot be parsed
   * @throws GitHubRepositoryNotFoundError if repository does not exist (404)
   * @throws RepositoryAccessDeniedError if GitHub App lacks access (403)
   */
  async validateAccess(url: string): Promise<GitHubRepositoryMetadata> {
    // Parse URL to extract owner/repo
    const { owner, repo } = this.urlParser.parse(url)

    try {
      // Get installation token from GitHub App
      // TODO: Get installationId from config or organization settings
      const installationId = 1 // Placeholder - should come from organization/project config
      const token = await this.githubAuthService.getToken(installationId)

      // Create Octokit instance with installation token
      const octokit = new Octokit({ auth: token })

      // Fetch repository metadata
      const { data } = await octokit.rest.repos.get({ owner, repo })

      return {
        owner,
        repo,
        defaultBranch: data.default_branch,
        isPrivate: data.private,
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error) {
        if (error.status === 404) {
          throw new GitHubRepositoryNotFoundError(owner, repo)
        }

        if (error.status === 403) {
          throw new RepositoryAccessDeniedError(owner, repo)
        }
      }

      // Re-throw other errors (network issues, rate limits, etc.)
      throw error
    }
  }
}
