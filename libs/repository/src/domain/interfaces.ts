/** Repository linked to a workflow, as needed to clone, fetch and open pull requests. */
export interface RepositoryReference {
  organizationId: string
  projectId: string
  name: string
  url: string
  branch: string | null
}

export interface EnsureRepoRequest {
  organizationId: string
  projectId: string
  repoName: string
  url: string
  branch: string | null
}

export interface RunGitOptions {
  cwd?: string
  /**
   * Remote the command talks to. When it is an https URL and a git token is configured,
   * the token is sent as a per-command Authorization header and never written to disk.
   */
  remoteUrl?: string
}

/**
 * Repository cache service for worker.
 * Clones and caches repositories on disk for AI agent access.
 */
export interface IRepoCacheService {
  /**
   * Make sure a local clone of the repository exists on this machine and is up to date.
   * Returns the absolute path of the clone.
   */
  ensureRepo(input: EnsureRepoRequest): Promise<string>

  /**
   * Run a git command and return stdout. Failures throw `RepositoryCacheError`
   * with credentials removed from the message.
   */
  runGit(args: string[], options?: RunGitOptions): Promise<string>
}
