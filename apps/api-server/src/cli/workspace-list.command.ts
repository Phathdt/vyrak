import { Inject, Injectable } from '@nestjs/common'
import type { IWorkspaceManager } from '@vyrak/agent-runtime'
import { WORKSPACE_MANAGER } from '@vyrak/workflow-core'

import { Command, CommandRunner, Option } from 'nest-commander'

/**
 * List workspaces command
 */
@Injectable()
@Command({
  name: 'workspace:list',
  description: 'List all workspaces',
})
export class WorkspaceListCommand extends CommandRunner {
  constructor(@Inject(WORKSPACE_MANAGER) private readonly workspaceManager: IWorkspaceManager) {
    super()
  }

  @Option({
    flags: '--org-id <orgId>',
    description: 'Organization ID (for worktree listing)',
  })
  parseOrgId(value: string): string {
    return value
  }

  @Option({
    flags: '--project-id <projectId>',
    description: 'Project ID (for worktree listing)',
  })
  parseProjectId(value: string): string {
    return value
  }

  async run(_passedParams: string[], options?: { orgId?: string; projectId?: string }): Promise<void> {
    try {
      if (options?.orgId && options?.projectId) {
        // List worktrees
        const worktrees = await this.workspaceManager.listWorktrees(options.orgId, options.projectId)

        console.log(`\n📦 Worktrees for ${options.orgId}/${options.projectId}\n`)
        if (worktrees.length === 0) {
          console.log('No worktrees found.')
        } else {
          console.table(
            worktrees.map((w) => ({
              RunID: w.runId,
              Branch: w.branch,
              Locked: w.isLocked ? '🔒' : '',
              Prunable: w.isPrunable ? '⚠️' : '',
              Created: w.createdAt.toISOString(),
            }))
          )
        }
      } else {
        // List all workspaces
        const workspaces = await this.workspaceManager.listWorkspaces()

        console.log(`\n📦 Total workspaces: ${workspaces.length}\n`)
        if (workspaces.length === 0) {
          console.log('No workspaces found.')
        } else {
          console.table(
            workspaces.map((w) => ({
              RunID: w.runId,
              Mode: w.isWorktree ? 'worktree' : 'clone',
              Branch: w.branchName || w.branch,
              Path: w.path,
              Created: w.createdAt.toISOString(),
            }))
          )
        }
      }
    } catch (error) {
      console.error('❌ Failed to list workspaces:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  }
}
