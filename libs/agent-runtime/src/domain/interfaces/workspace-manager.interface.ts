/**
 * Workspace information
 */
export interface WorkspaceInfo {
  runId: string
  path: string
  repoUrl: string
  branch: string
  createdAt: Date
  /** True if workspace uses git worktree */
  isWorktree?: boolean
  /** Branch name (worktree only) */
  branchName?: string
  /** Main repository path (worktree only) */
  mainRepoPath?: string
}

/**
 * Worktree creation options
 */
export interface WorktreeOptions {
  /** Force recreate if exists */
  force?: boolean
  /** Auto-fetch main repo first (default: true) */
  autoFetch?: boolean
  /** Branch prefix (default: 'workflow/') */
  branchPrefix?: string
  /** Custom branch name (overrides prefix+runId) */
  newBranch?: string
}

/**
 * Worktree information
 */
export interface WorktreeInfo {
  /** Run ID extracted from branch name */
  runId: string
  /** Worktree path */
  path: string
  /** Branch name */
  branch: string
  /** Git lock status */
  isLocked: boolean
  /** Can be pruned */
  isPrunable: boolean
  /** Creation time */
  createdAt: Date
  /** Last used time */
  lastUsedAt?: Date
}

/**
 * Workspace metadata stored in .metadata.json
 */
export interface WorkspaceMetadata {
  runId: string
  repoUrl: string
  branch: string
  createdAt: string
  isWorktree?: boolean
  mainRepoPath?: string
  branchName?: string
  workspacePath: string
}

/**
 * Cleanup options for workspace removal
 */
export interface CleanupOptions {
  /** Delete branch after worktree removal (default: true) */
  deleteBranch?: boolean
  /** Force removal even if locked (default: false) */
  force?: boolean
  /** Keep artifacts directory (default: false) */
  keepArtifacts?: boolean
}

/**
 * Result of cleanup operations
 */
export interface CleanupResult {
  /** Number of workspaces cleaned */
  cleaned: number
  /** Number of cleanup failures */
  failed: number
  /** Bytes recovered */
  diskRecovered: number
  /** Cleanup errors */
  errors: CleanupError[]
}

/**
 * Cleanup error detail
 */
export interface CleanupError {
  runId: string
  path: string
  reason: string
}

/**
 * Workspace manager interface
 */
export interface IWorkspaceManager {
  /**
   * Create isolated workspace for a workflow run
   */
  createWorkspace(runId: string, repoUrl: string, branch: string): Promise<string>

  /**
   * Create workspace with git worktree (fast, disk-efficient)
   *
   * @param runId - Run ID
   * @param repoUrl - Repository URL
   * @param baseBranch - Base branch to create worktree from
   * @param options - Worktree options
   * @returns Workspace information
   */
  createWorkspaceWithWorktree(
    runId: string,
    repoUrl: string,
    baseBranch?: string,
    options?: WorktreeOptions
  ): Promise<WorkspaceInfo>

  /**
   * List worktrees for an organization and project
   *
   * @param orgId - Organization ID
   * @param projectId - Project ID
   * @returns List of worktrees
   */
  listWorktrees(orgId: string, projectId: string): Promise<WorktreeInfo[]>

  /**
   * Cleanup workspace after execution
   */
  cleanupWorkspace(runId: string, options?: CleanupOptions): Promise<void>

  /**
   * Cleanup stale worktree workspaces
   *
   * @param orgId - Organization ID
   * @param projectId - Project ID
   * @param maxAgeMs - Maximum age in milliseconds
   * @returns Cleanup result
   */
  cleanupStaleWorktrees(orgId: string, projectId: string, maxAgeMs: number): Promise<CleanupResult>

  /**
   * Prune deleted worktrees from main repository
   *
   * @param orgId - Organization ID
   * @param projectId - Project ID
   */
  pruneWorktrees(orgId: string, projectId: string): Promise<void>

  /**
   * Get workspace path for a run
   */
  getWorkspacePath(runId: string): string

  /**
   * Get repository path within workspace
   */
  getRepoPath(runId: string): string

  /**
   * Get artifacts path within workspace
   */
  getArtifactsPath(runId: string): string

  /**
   * List all active workspaces
   */
  listWorkspaces(): Promise<WorkspaceInfo[]>
}
