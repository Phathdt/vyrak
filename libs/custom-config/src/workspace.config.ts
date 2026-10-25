import { z } from 'zod'

export const WorkspaceConfigSchema = z.object({
  mode: z.literal('worktree'), // Only worktree mode supported
  mainReposPath: z.string().min(1), // Required for worktree mode
  workspacesPath: z.string().default('/tmp/vyrak-workspaces'),
  cleanupOnSuccess: z.boolean().default(true),
  cleanupOnFailure: z.boolean().default(false),
  worktree: z.object({
    baseBranch: z.string().default('main'),
    branchPrefix: z.string().default('workflow/'),
    autoFetch: z.boolean().default(true),
    autoCleanupBranch: z.boolean().default(true),
  }),
})

export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>

/**
 * Load workspace configuration from environment variables
 *
 * Environment variable mapping:
 * - WORKSPACE_MODE → mode (must be 'worktree')
 * - MAIN_REPOS_PATH → mainReposPath (required)
 * - WORKSPACES_PATH → workspacesPath
 * - WORKSPACE_CLEANUP_ON_SUCCESS → cleanupOnSuccess
 * - WORKSPACE_CLEANUP_ON_FAILURE → cleanupOnFailure
 * - WORKTREE_BASE_BRANCH → worktree.baseBranch
 * - WORKTREE_BRANCH_PREFIX → worktree.branchPrefix
 * - WORKTREE_AUTO_FETCH → worktree.autoFetch
 * - WORKTREE_AUTO_CLEANUP_BRANCH → worktree.autoCleanupBranch
 */
export function loadWorkspaceConfig(): WorkspaceConfig {
  // Validate mode is worktree
  const mode = process.env.WORKSPACE_MODE
  if (mode && mode !== 'worktree') {
    throw new Error(
      `Invalid WORKSPACE_MODE: "${mode}". Only "worktree" mode is supported. Please update your .env file.`
    )
  }

  // Validate main repos path is provided
  const mainReposPath = process.env.MAIN_REPOS_PATH
  if (!mainReposPath) {
    throw new Error('MAIN_REPOS_PATH is required for worktree mode. Please set it in your .env file.')
  }

  const rawConfig = {
    mode: 'worktree' as const,
    mainReposPath,
    workspacesPath: process.env.WORKSPACES_PATH || '/tmp/vyrak-workspaces',
    cleanupOnSuccess: process.env.WORKSPACE_CLEANUP_ON_SUCCESS !== 'false',
    cleanupOnFailure: process.env.WORKSPACE_CLEANUP_ON_FAILURE === 'true',
    worktree: {
      baseBranch: process.env.WORKTREE_BASE_BRANCH || 'main',
      branchPrefix: process.env.WORKTREE_BRANCH_PREFIX || 'workflow/',
      autoFetch: process.env.WORKTREE_AUTO_FETCH !== 'false',
      autoCleanupBranch: process.env.WORKTREE_AUTO_CLEANUP_BRANCH !== 'false',
    },
  }

  return WorkspaceConfigSchema.parse(rawConfig)
}
