import { Inject, Injectable } from '@nestjs/common'
import type { IMainRepoManager, IWorkspaceManager } from '@vyrak/agent-runtime'
import { MAIN_REPO_MANAGER, WORKSPACE_MANAGER } from '@vyrak/workflow-core'

import { Command, CommandRunner, Option } from 'nest-commander'

/**
 * Workspace health check command
 */
@Injectable()
@Command({
  name: 'workspace:health',
  description: 'Check main repo and workspace health',
})
export class WorkspaceHealthCommand extends CommandRunner {
  constructor(
    @Inject(MAIN_REPO_MANAGER) private readonly mainRepoManager: IMainRepoManager,
    @Inject(WORKSPACE_MANAGER) private readonly workspaceManager: IWorkspaceManager
  ) {
    super()
  }

  @Option({
    flags: '--org-id <orgId>',
    description: 'Organization ID',
    required: true,
  })
  parseOrgId(value: string): string {
    return value
  }

  @Option({
    flags: '--project-id <projectId>',
    description: 'Project ID',
    required: true,
  })
  parseProjectId(value: string): string {
    return value
  }

  async run(_passedParams: string[], options: { orgId: string; projectId: string }): Promise<void> {
    try {
      const health = await this.mainRepoManager.checkRepoHealth(options.orgId, options.projectId)

      console.log(`\n📊 Health Report: ${options.orgId}/${options.projectId}\n`)
      console.log(`Status: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`)
      console.log(`Path: ${health.path}`)
      console.log(`Exists: ${health.exists ? '✅' : '❌'}`)
      console.log(`Is Git Repo: ${health.isGitRepo ? '✅' : '❌'}`)
      console.log(`Has Remote: ${health.hasRemote ? '✅' : '❌'}`)
      console.log(`Disk Usage: ${(health.diskUsage / 1024 / 1024).toFixed(2)} MB`)
      console.log(`Last Fetched: ${health.lastFetched?.toISOString() || 'Never'}`)

      if (health.issues.length > 0) {
        console.log(`\n⚠️  Issues:`)
        health.issues.forEach((issue) => {
          console.log(`  - ${issue}`)
        })
      }

      // List worktrees
      const worktrees = await this.workspaceManager.listWorktrees(options.orgId, options.projectId)

      console.log(`\n🌳 Active Worktrees: ${worktrees.length}`)
      if (worktrees.length > 0) {
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

      // Exit with error code if unhealthy
      if (!health.healthy) {
        console.log('\n❌ Health check failed\n')
        process.exit(1)
      }

      console.log('\n✅ Health check passed\n')
    } catch (error) {
      console.error('❌ Health check failed:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  }
}
