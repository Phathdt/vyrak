import { Inject, Injectable } from '@nestjs/common'
import type { IWorkspaceManager } from '@vyrak/agent-runtime'
import { WORKSPACE_MANAGER } from '@vyrak/workflow-core'

import { Command, CommandRunner, Option } from 'nest-commander'

/**
 * CLI command for cleaning up stale workspace worktrees
 */
@Injectable()
@Command({
  name: 'workspace:clean-stale',
  description: 'Clean up stale worktree workspaces',
})
export class WorkspaceCleanupCommand extends CommandRunner {
  constructor(
    @Inject(WORKSPACE_MANAGER)
    private readonly workspaceManager: IWorkspaceManager
  ) {
    super()
  }

  async run(_passedParams: string[], options: { maxAge?: number; orgId: string; projectId: string }): Promise<void> {
    const maxAgeMs = options.maxAge || 24 * 60 * 60 * 1000 // 24 hours

    console.log(`Cleaning stale worktrees older than ${maxAgeMs / 1000 / 60 / 60}h...`)
    console.log(`Organization: ${options.orgId}`)
    console.log(`Project: ${options.projectId}`)
    console.log('')

    const result = await this.workspaceManager.cleanupStaleWorktrees(options.orgId, options.projectId, maxAgeMs)

    console.log('✅ Cleaned: ' + result.cleaned)
    console.log('❌ Failed: ' + result.failed)
    console.log(`💾 Disk recovered: ${(result.diskRecovered / 1024 / 1024).toFixed(2)} MB`)

    if (result.errors.length > 0) {
      console.log('')
      console.log('Errors:')
      result.errors.forEach((error) => {
        console.log(`  - ${error.runId}: ${error.reason}`)
      })
    }
  }

  @Option({
    flags: '--max-age <hours>',
    description: 'Maximum age in hours (default: 24)',
  })
  parseMaxAge(value: string): number {
    return parseInt(value, 10) * 60 * 60 * 1000
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
}
