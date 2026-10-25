/**
 * Options for main repository operations
 */
export interface MainRepoOptions {
  /** Force re-clone if repository already exists */
  force?: boolean
  /** Shallow clone depth (null = full clone) */
  depth?: number
  /** Auto-fetch before use (default: true) */
  fetchBeforeUse?: boolean
}

/**
 * Repository health status
 */
export interface RepoHealthStatus {
  /** Overall health status */
  healthy: boolean
  /** Repository path */
  path: string
  /** Repository exists on disk */
  exists: boolean
  /** Directory is a valid git repository */
  isGitRepo: boolean
  /** Repository has remote configured */
  hasRemote: boolean
  /** Disk usage in bytes */
  diskUsage: number
  /** Last fetch timestamp */
  lastFetched?: Date
  /** List of health issues */
  issues: string[]
}

/**
 * Main repository manager interface
 *
 * Manages shared main repositories that serve as the base for git worktrees.
 * Each organization/project pair has one main repository that is cloned once
 * and kept up-to-date with git fetch.
 */
export interface IMainRepoManager {
  /**
   * Ensure main repository exists and is up to date
   *
   * @param orgId - Organization ID
   * @param projectId - Project ID
   * @param repoUrl - Git repository URL
   * @param options - Repository options
   * @returns Path to main repository
   */
  ensureMainRepo(orgId: string, projectId: string, repoUrl: string, options?: MainRepoOptions): Promise<string>

  /**
   * Update main repository (git fetch)
   *
   * @param orgId - Organization ID
   * @param projectId - Project ID
   */
  updateMainRepo(orgId: string, projectId: string): Promise<void>

  /**
   * Check if main repository exists
   *
   * @param orgId - Organization ID
   * @param projectId - Project ID
   * @returns True if repository exists
   */
  mainRepoExists(orgId: string, projectId: string): Promise<boolean>

  /**
   * Get main repository path
   *
   * @param orgId - Organization ID
   * @param projectId - Project ID
   * @returns Repository path
   */
  getMainRepoPath(orgId: string, projectId: string): string

  /**
   * Health check for main repository
   *
   * @param orgId - Organization ID
   * @param projectId - Project ID
   * @returns Repository health status
   */
  checkRepoHealth(orgId: string, projectId: string): Promise<RepoHealthStatus>

  /**
   * Delete main repository (admin only)
   *
   * @param orgId - Organization ID
   * @param projectId - Project ID
   */
  deleteMainRepo(orgId: string, projectId: string): Promise<void>
}
