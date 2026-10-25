import { z } from 'zod'

export const WorkspaceConfigSchema = z.object({
  mode: z.enum(['clone', 'worktree']).default('clone'),
  mainReposPath: z.string().default('/var/vyrak/repos'),
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
 * - WORKSPACE_MODE → mode
 * - MAIN_REPOS_PATH → mainReposPath
 * - WORKSPACES_PATH → workspacesPath
 * - WORKSPACE_CLEANUP_ON_SUCCESS → cleanupOnSuccess
 * - WORKSPACE_CLEANUP_ON_FAILURE → cleanupOnFailure
 * - WORKTREE_BASE_BRANCH → worktree.baseBranch
 * - WORKTREE_BRANCH_PREFIX → worktree.branchPrefix
 * - WORKTREE_AUTO_FETCH → worktree.autoFetch
 * - WORKTREE_AUTO_CLEANUP_BRANCH → worktree.autoCleanupBranch
 */
export function loadWorkspaceConfig(): WorkspaceConfig {
  const rawConfig = {
    mode: process.env.WORKSPACE_MODE || 'clone',
    mainReposPath: process.env.MAIN_REPOS_PATH || '/var/vyrak/repos',
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
