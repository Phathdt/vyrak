export interface EnsureRepoInput {
  organizationId: string
  projectId: string
  repoName: string
  url: string
  branch: string
}

/** Repository linked to a workflow, as needed to clone, fetch and open pull requests. */
export interface RepositoryReference {
  organizationId: string
  projectId: string
  name: string
  url: string
  branch: string
}

export interface RunGitOptions {
  cwd?: string
  /**
   * Remote the command talks to. When it is an https URL and a git token is configured,
   * the token is sent as a per-command Authorization header and never written to disk.
   */
  remoteUrl?: string
}

export interface IRepoCacheService {
  /**
   * Make sure a local clone of the repository exists on this machine and is up to date.
   * Returns the absolute path of the clone.
   */
  ensureRepo(input: EnsureRepoInput): Promise<string>

  /**
   * Run a git command and return stdout. Failures throw `RepositoryCacheError`
   * with credentials removed from the message.
   */
  runGit(args: string[], options?: RunGitOptions): Promise<string>
}
