import { execFile } from 'node:child_process'
import { access, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import type { IConfigService } from '@vyrak/custom-config'

const execFileAsync = promisify(execFile)

export type WorktreePrepareInput = {
  organizationId: string
  projectId: string
  workflowId: string
  repositoryName?: string
  phaseKey: string
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

async function isGitRepo(dir: string): Promise<boolean> {
  return pathExists(path.join(dir, '.git'))
}

export class GitWorktreeService {
  constructor(private readonly configService: IConfigService) {}

  async resolveMainRepoRoot(input: WorktreePrepareInput): Promise<string | null> {
    const mainReposPath = this.configService.workspace?.mainReposPath
    if (!mainReposPath) {
      return null
    }

    const candidates = [
      input.repositoryName
        ? path.join(mainReposPath, input.organizationId, input.projectId, input.repositoryName)
        : null,
      path.join(mainReposPath, input.organizationId, input.projectId),
      path.join(mainReposPath, input.projectId),
      input.repositoryName ? path.join(mainReposPath, input.repositoryName) : null,
      mainReposPath,
    ].filter(Boolean) as string[]

    for (const candidate of candidates) {
      if (await isGitRepo(candidate)) {
        return candidate
      }
    }

    return null
  }

  buildBranchName(workflowId: string, phaseKey: string): string {
    const prefix = this.configService.workspace?.worktree?.branchPrefix ?? 'workflow/'
    const slug = workflowId.slice(0, 8)
    return `${prefix}${slug}/${phaseKey}`.replace(/\/+/g, '/')
  }

  async prepareWorktree(input: WorktreePrepareInput): Promise<WorktreePrepareResult> {
    const mainRepoRoot = await this.resolveMainRepoRoot(input)
    if (!mainRepoRoot) {
      throw new Error(
        'No git main repository found under MAIN_REPOS_PATH. Clone the linked repo before running implementation.'
      )
    }

    const workspacesPath = this.configService.workspace?.workspacesPath ?? '/tmp/vyrak-workspaces'
    const workspacePath = path.join(
      workspacesPath,
      input.organizationId,
      input.projectId,
      input.workflowId,
      input.phaseKey
    )
    await mkdir(path.dirname(workspacePath), { recursive: true })

    const branch = this.buildBranchName(input.workflowId, input.phaseKey)
    const baseBranch = this.configService.workspace?.worktree?.baseBranch ?? 'main'
    const autoFetch = this.configService.workspace?.worktree?.autoFetch !== false

    if (autoFetch) {
      await execFileAsync('git', ['fetch', 'origin', baseBranch], { cwd: mainRepoRoot }).catch(() => undefined)
    }

    if (await pathExists(workspacePath)) {
      await execFileAsync('git', ['worktree', 'remove', '--force', workspacePath], { cwd: mainRepoRoot }).catch(
        () => undefined
      )
    }

    await execFileAsync('git', ['worktree', 'add', '-B', branch, workspacePath, baseBranch], { cwd: mainRepoRoot })

    return { workspacePath, branch, mainRepoRoot }
  }
}
