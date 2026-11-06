import { access, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'

import type { IConfigService } from '@vyrak/custom-config'
import type { IRepoCacheService, RepositoryReference } from '@vyrak/workflow-core'

export type WorktreePrepareInput = {
  organizationId: string
  projectId: string
  workflowId: string
  phaseKey: string
  repository: RepositoryReference
}

export type ReviewWorktreePrepareInput = WorktreePrepareInput & {
  /** Branch that the implementation run pushed to the remote. */
  branch: string
}

export type WorktreePrepareResult = {
  workspacePath: string
  branch: string
  mainRepoRoot: string
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await access(candidate)
    return true
  } catch {
    return false
  }
}

function isMissingRemoteRef(error: unknown): boolean {
  return error instanceof Error && error.message.includes("couldn't find remote ref")
}

/**
 * Creates and removes git worktrees on top of the local repository cache.
 * Plain TypeScript class, no framework decorators.
 */
export class GitWorktreeService {
  constructor(
    private readonly configService: IConfigService,
    private readonly repoCache: IRepoCacheService
  ) {}

  buildBranchName(workflowId: string, phaseKey: string): string {
    const prefix = this.configService.workspace?.worktree?.branchPrefix ?? 'workflow/'
    const slug = workflowId.slice(0, 8)
    return `${prefix}${slug}/${phaseKey}`.replace(/\/+/g, '/')
  }

  /**
   * Make sure the repository is cloned and up to date, then create a worktree on a new
   * workflow branch that starts from the repository's configured branch.
   */
  async prepareWorktree(input: WorktreePrepareInput): Promise<WorktreePrepareResult> {
    const mainRepoRoot = await this.ensureMainRepo(input.repository)
    const workspacePath = this.buildWorkspacePath(input)
    const branch = this.buildBranchName(input.workflowId, input.phaseKey)
    const baseBranch = input.repository.branch || this.configService.workspace?.worktree?.baseBranch || 'main'

    await this.discardWorktree(mainRepoRoot, workspacePath)
    await this.repoCache.runGit(['worktree', 'add', '-B', branch, workspacePath, `origin/${baseBranch}`], {
      cwd: mainRepoRoot,
    })

    return { workspacePath, branch, mainRepoRoot }
  }

  /**
   * Create a detached worktree of a branch that an earlier run pushed to the remote.
   * Returns null when the remote does not have that branch (nothing was pushed).
   */
  async prepareReviewWorktree(input: ReviewWorktreePrepareInput): Promise<WorktreePrepareResult | null> {
    const mainRepoRoot = await this.ensureMainRepo(input.repository)

    try {
      await this.repoCache.runGit(['fetch', 'origin', input.branch], {
        cwd: mainRepoRoot,
        remoteUrl: input.repository.url,
      })
    } catch (error) {
      if (isMissingRemoteRef(error)) {
        return null
      }
      throw error
    }

    const workspacePath = this.buildWorkspacePath(input)
    await this.discardWorktree(mainRepoRoot, workspacePath)
    await this.repoCache.runGit(['worktree', 'add', '--detach', workspacePath, `origin/${input.branch}`], {
      cwd: mainRepoRoot,
    })

    return { workspacePath, branch: input.branch, mainRepoRoot }
  }

  /** Remove a worktree directory and its registration so the disk of the host does not fill up. */
  async removeWorktree(mainRepoRoot: string, workspacePath: string): Promise<void> {
    await this.repoCache.runGit(['worktree', 'remove', '--force', workspacePath], { cwd: mainRepoRoot })
  }

  private ensureMainRepo(repository: RepositoryReference): Promise<string> {
    return this.repoCache.ensureRepo({
      organizationId: repository.organizationId,
      projectId: repository.projectId,
      repoName: repository.name,
      url: repository.url,
      branch: repository.branch,
    })
  }

  private buildWorkspacePath(input: WorktreePrepareInput): string {
    const workspacesPath = this.configService.workspace?.workspacesPath ?? '/tmp/vyrak-workspaces'
    return path.join(workspacesPath, input.organizationId, input.projectId, input.workflowId, input.phaseKey)
  }

  /**
   * Clear a previous worktree at the same path (a retried job, or a pod that restarted and lost the directory)
   * so that `git worktree add` does not fail on stale registrations.
   */
  private async discardWorktree(mainRepoRoot: string, workspacePath: string): Promise<void> {
    await mkdir(path.dirname(workspacePath), { recursive: true })

    if (await pathExists(workspacePath)) {
      await this.removeWorktree(mainRepoRoot, workspacePath).catch(() => undefined)
      await rm(workspacePath, { recursive: true, force: true })
    }
    await this.repoCache.runGit(['worktree', 'prune'], { cwd: mainRepoRoot })
  }
}
