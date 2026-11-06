import { execFile, execFileSync } from 'node:child_process'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { GitWorktreeService } from './git-worktree.service'

import type { IConfigService } from '@vyrak/custom-config'
import type { EnsureRepoInput, IRepoCacheService, RepositoryReference, RunGitOptions } from '@vyrak/workflow-core'

const ORG_ID = '11111111-1111-4111-8111-111111111111'
const PROJECT_ID = '22222222-2222-4222-8222-222222222222'
const WORKFLOW_ID = '33333333-3333-4333-8333-333333333333'

function git(args: string[], cwd?: string): string {
  return execFileSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.com', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

/** Implements the repo cache contract on top of the real git binary, cloning into a fixed directory. */
class LocalGitRepoCache implements IRepoCacheService {
  constructor(private readonly cloneRoot: string) {}

  async ensureRepo(input: EnsureRepoInput): Promise<string> {
    const target = path.join(this.cloneRoot, input.repoName)
    try {
      await access(path.join(target, '.git'))
      git(['fetch', 'origin', input.branch], target)
    } catch {
      git(['clone', '--branch', input.branch, input.url, target])
    }
    return target
  }

  runGit(args: string[], options: RunGitOptions = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile('git', args, { cwd: options.cwd, env: { ...process.env, LC_ALL: 'C' } }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || error.message))
          return
        }
        resolve(stdout)
      })
    })
  }
}

describe('GitWorktreeService', () => {
  let tmpRoot: string
  let originPath: string
  let seedPath: string
  let service: GitWorktreeService
  let repository: RepositoryReference

  beforeEach(async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'git-worktree-spec-'))
    originPath = path.join(tmpRoot, 'origin.git')
    seedPath = path.join(tmpRoot, 'seed')

    git(['init', '--bare', '-b', 'main', originPath])
    git(['init', '-b', 'main', seedPath])
    await writeFile(path.join(seedPath, 'README.md'), 'hello\n')
    git(['add', '-A'], seedPath)
    git(['commit', '-m', 'initial'], seedPath)
    git(['remote', 'add', 'origin', pathToFileURL(originPath).href], seedPath)
    git(['push', 'origin', 'main'], seedPath)

    repository = {
      organizationId: ORG_ID,
      projectId: PROJECT_ID,
      name: 'app',
      url: pathToFileURL(originPath).href,
      branch: 'main',
    }

    const config = {
      workspace: {
        mode: 'worktree',
        mainReposPath: path.join(tmpRoot, 'repos'),
        workspacesPath: path.join(tmpRoot, 'workspaces'),
        cleanupOnSuccess: true,
        cleanupOnFailure: false,
        worktree: { baseBranch: 'main', branchPrefix: 'workflow/', autoFetch: true, autoCleanupBranch: true },
      },
    } as unknown as IConfigService
    service = new GitWorktreeService(config, new LocalGitRepoCache(path.join(tmpRoot, 'repos')))
  })

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true })
  })

  const prepareInput = (phaseKey = 'implementation') => ({
    organizationId: ORG_ID,
    projectId: PROJECT_ID,
    workflowId: WORKFLOW_ID,
    phaseKey,
    repository,
  })

  it('builds a branch name from the prefix, workflow id and phase key', () => {
    expect(service.buildBranchName(WORKFLOW_ID, 'implementation')).toBe('workflow/33333333/implementation')
  })

  it('creates a worktree on a new branch that starts from the repository branch', async () => {
    const result = await service.prepareWorktree(prepareInput())

    expect(result.branch).toBe('workflow/33333333/implementation')
    expect(result.workspacePath).toBe(
      path.join(tmpRoot, 'workspaces', ORG_ID, PROJECT_ID, WORKFLOW_ID, 'implementation')
    )
    expect(await readFile(path.join(result.workspacePath, 'README.md'), 'utf8')).toBe('hello\n')
    expect(git(['rev-parse', '--abbrev-ref', 'HEAD'], result.workspacePath).trim()).toBe(result.branch)
  })

  it('recreates the worktree when the same phase runs again', async () => {
    const first = await service.prepareWorktree(prepareInput())
    await writeFile(path.join(first.workspacePath, 'leftover.txt'), 'from the first run')

    const second = await service.prepareWorktree(prepareInput())

    expect(second.workspacePath).toBe(first.workspacePath)
    await expect(access(path.join(second.workspacePath, 'leftover.txt'))).rejects.toThrow()
  })

  it('recovers when the worktree directory was lost but git still has it registered', async () => {
    const first = await service.prepareWorktree(prepareInput())
    await rm(first.workspacePath, { recursive: true, force: true })

    const second = await service.prepareWorktree(prepareInput())

    await expect(access(path.join(second.workspacePath, 'README.md'))).resolves.toBeUndefined()
  })

  it('removes a worktree directory and its registration', async () => {
    const result = await service.prepareWorktree(prepareInput())

    await service.removeWorktree(result.mainRepoRoot, result.workspacePath)

    await expect(access(result.workspacePath)).rejects.toThrow()
    expect(git(['worktree', 'list', '--porcelain'], result.mainRepoRoot)).not.toContain(result.workspacePath)
  })

  it('checks out a branch that another host pushed, for review', async () => {
    git(['checkout', '-b', 'workflow/33333333/implementation'], seedPath)
    await writeFile(path.join(seedPath, 'feature.txt'), 'feature\n')
    git(['add', '-A'], seedPath)
    git(['commit', '-m', 'feature'], seedPath)
    git(['push', 'origin', 'workflow/33333333/implementation'], seedPath)

    const result = await service.prepareReviewWorktree({
      ...prepareInput('code-review'),
      branch: 'workflow/33333333/implementation',
    })

    expect(result).not.toBeNull()
    expect(await readFile(path.join(result!.workspacePath, 'feature.txt'), 'utf8')).toBe('feature\n')
  })

  it('returns null for review when the branch was never pushed', async () => {
    const result = await service.prepareReviewWorktree({
      ...prepareInput('code-review'),
      branch: 'workflow/33333333/never-pushed',
    })

    expect(result).toBeNull()
  })
})
