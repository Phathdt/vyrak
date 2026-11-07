/**
 * Base error for git repository domain operations.
 */
export class GitRepositoryDomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Thrown when GitHub App does not have access to the requested repository.
 */
export class RepositoryAccessDeniedError extends GitRepositoryDomainError {
  constructor(
    public readonly owner: string,
    public readonly repo: string
  ) {
    super(
      `GitHub App cannot access repository ${owner}/${repo}. Ensure the GitHub App is installed on this repository.`
    )
  }
}

/**
 * Thrown when the provided repository URL is invalid or cannot be parsed.
 */
export class InvalidRepositoryUrlError extends GitRepositoryDomainError {
  constructor(public readonly url: string) {
    super(`Invalid GitHub repository URL: ${url}. Expected format: https://github.com/owner/repo or owner/repo`)
  }
}

/**
 * Thrown when the repository does not exist on GitHub.
 */
export class GitHubRepositoryNotFoundError extends GitRepositoryDomainError {
  constructor(
    public readonly owner: string,
    public readonly repo: string
  ) {
    super(`Repository ${owner}/${repo} not found on GitHub. Check the URL and ensure it exists.`)
  }
}

/**
 * Thrown when attempting to connect a repository that is already connected to the project.
 */
export class RepositoryAlreadyConnectedError extends GitRepositoryDomainError {
  constructor(
    public readonly url: string,
    public readonly projectId: string
  ) {
    super(`Repository ${url} is already connected to project ${projectId}.`)
  }
}
