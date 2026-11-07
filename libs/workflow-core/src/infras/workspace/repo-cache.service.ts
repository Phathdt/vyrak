import { execFile } from 'node:child_process'
import { access, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'

import { InvalidRepositoryReferenceError, RepositoryCacheError } from '../../domain/exceptions/workflow.exceptions'

import type { EnsureRepoRequest, IRepoCacheService, RunGitOptions } from '../../domain/interfaces/repo-cache.interface'
import type { IConfigService } from '@vyrak/custom-config'
import type { IGitHubAuthService } from '@vyrak/github-auth'

export type GitExecResult = { stdout: string; stderr: string }

export type GitExecOptions = {
  cwd?: string
  env: NodeJS.ProcessEnv
  timeoutMs: number
}

/** Runs `git` with an argument array. Never goes through a shell. */
export type GitExecutor = (args: string[], options: GitExecOptions) => Promise<GitExecResult>

export type RepoCacheServiceOptions = {
  exec?: GitExecutor
  log?: (message: string) => void
}

const SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/
const BRANCH_PATTERN = /^[A-Za-z0-9._/-]+$/
const GIT_TIMEOUT_MS = 10 * 60 * 1000
const MAX_ERROR_DETAIL = 500
const LOCAL_APP_ENVS = new Set(['local', 'test'])

// Shared by every instance in the process, so a repository is never cloned or fetched twice at once
// even when several services each hold their own RepoCacheService.
const repoLocks = new Map<string, Promise<void>>()

function subcommandOf(args: string[]): string {
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '-c') {
      i += 1
      continue
    }
    return args[i]
  }
  return ''
}

const defaultExec: GitExecutor = (args, options) =>
  new Promise((resolve, reject) => {
    execFile(
      'git',
      args,
      { cwd: options.cwd, env: options.env, timeout: options.timeoutMs, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(Object.assign(error, { stdout, stderr }))
          return
        }
        resolve({ stdout, stderr })
      }
    )
  })

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await access(candidate)
    return true
  } catch {
    return false
  }
}

/**
 * Keeps one git clone per repository on the local disk of the current process host.
 * First call clones, later calls fetch. Concurrent calls for the same repository are serialized.
 *
 * The GitHub App installation token is sent only as a per-command `http.extraHeader` for https remotes.
 * It is never put into a URL, `.git/config`, logs or error messages.
 * Plain TypeScript class, wired by a factory in the module.
 */
export class RepoCacheService implements IRepoCacheService {
  private readonly exec: GitExecutor
  private readonly log: (message: string) => void

  constructor(
    private readonly configService: IConfigService,
    private readonly githubAuthService: IGitHubAuthService,
    options: RepoCacheServiceOptions = {}
  ) {
    this.exec = options.exec ?? defaultExec
    this.log = options.log ?? ((message) => console.log(message))
  }

  async ensureRepo(input: EnsureRepoRequest): Promise<string> {
    this.assertSafeUrl(input.url)
    const branch = input.branch ?? 'main'
    this.assertSafeBranch(branch)
    const repoPath = this.resolveRepoPath(input)

    return this.withLock(repoPath, async () => {
      if (await pathExists(path.join(repoPath, '.git'))) {
        if (this.autoFetch) {
          await this.runGit(['fetch', 'origin', branch], { cwd: repoPath, remoteUrl: input.url })
        }
        return repoPath
      }

      await this.clone({ ...input, branch }, repoPath)
      return repoPath
    })
  }

  async runGit(args: string[], options: RunGitOptions = {}): Promise<string> {
    const authArgs = await this.buildAuthArgs(options.remoteUrl)
    const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C' }

    try {
      const { stdout } = await this.exec([...authArgs, ...args], {
        cwd: options.cwd,
        env,
        timeoutMs: GIT_TIMEOUT_MS,
      })
      return stdout
    } catch (error) {
      throw new RepositoryCacheError(`git ${subcommandOf(args)} failed: ${this.describeGitError(error)}`)
    }
  }

  private get autoFetch(): boolean {
    return this.configService.workspace?.worktree?.autoFetch !== false
  }

  private get mainReposPath(): string {
    const mainReposPath = this.configService.workspace?.mainReposPath
    if (!mainReposPath) {
      throw new InvalidRepositoryReferenceError('workspace.mainReposPath is not configured')
    }
    return path.resolve(mainReposPath)
  }

  private resolveRepoPath(input: EnsureRepoRequest): string {
    const segments: Array<[string, string]> = [
      ['organizationId', input.organizationId],
      ['projectId', input.projectId],
      ['repoName', input.repoName],
    ]
    for (const [label, value] of segments) {
      if (!SEGMENT_PATTERN.test(value) || value === '.' || value === '..') {
        throw new InvalidRepositoryReferenceError(`${label} contains characters outside [A-Za-z0-9._-]`)
      }
    }

    const root = this.mainReposPath
    const resolved = path.resolve(root, input.organizationId, input.projectId, input.repoName)
    if (!resolved.startsWith(root + path.sep)) {
      throw new InvalidRepositoryReferenceError('repository path escapes the main repos directory')
    }
    return resolved
  }

  private assertSafeUrl(rawUrl: string): void {
    if (rawUrl.startsWith('-')) {
      throw new InvalidRepositoryReferenceError('url must not start with "-"')
    }

    let parsed: URL
    try {
      parsed = new URL(rawUrl)
    } catch {
      throw new InvalidRepositoryReferenceError('url is not a valid URL')
    }

    if (parsed.username || parsed.password) {
      throw new InvalidRepositoryReferenceError('url must not embed credentials; configure GitHub App instead')
    }

    if (parsed.protocol === 'https:') {
      return
    }
    if (parsed.protocol === 'file:' && this.allowsLocalRemotes()) {
      return
    }
    throw new InvalidRepositoryReferenceError(`url scheme "${parsed.protocol.replace(':', '')}" is not allowed`)
  }

  private allowsLocalRemotes(): boolean {
    // CustomConfigService treats an unset APP_ENV as "local".
    return LOCAL_APP_ENVS.has(process.env.APP_ENV ?? 'local')
  }

  private assertSafeBranch(branch: string): void {
    if (!BRANCH_PATTERN.test(branch) || branch.startsWith('-') || branch.includes('..')) {
      throw new InvalidRepositoryReferenceError('branch contains characters that are not allowed')
    }
  }

  private async buildAuthArgs(remoteUrl?: string): Promise<string[]> {
    if (!remoteUrl) {
      return []
    }

    let parsed: URL
    try {
      parsed = new URL(remoteUrl)
    } catch {
      return []
    }
    if (parsed.protocol !== 'https:') {
      return []
    }

    // GitHub App authentication (required)
    if (!this.githubAuthService) {
      throw new RepositoryCacheError('GitHub App authentication not configured')
    }

    const installationId = this.configService.git?.githubApp?.installationId
    if (!installationId) {
      throw new RepositoryCacheError('GitHub App installation ID not configured')
    }

    try {
      const token = await this.githubAuthService.getToken(installationId)
      return ['-c', `http.extraHeader=Authorization: Basic ${this.encodeBasicCredential(token)}`]
    } catch (error) {
      throw new RepositoryCacheError(
        `GitHub App authentication failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private encodeBasicCredential(token: string): string {
    return Buffer.from(`x-access-token:${token}`).toString('base64')
  }

  private async clone(input: EnsureRepoRequest & { branch: string }, repoPath: string): Promise<void> {
    await mkdir(path.dirname(repoPath), { recursive: true })
    // No ".git" here, so whatever exists is the leftover of an interrupted clone.
    await rm(repoPath, { recursive: true, force: true })

    const startedAt = Date.now()
    this.log(`[RepoCache] Cloning ${input.url} (branch ${input.branch}) into ${repoPath}`)
    try {
      await this.runGit(['clone', '--filter=blob:none', '--branch', input.branch, '--', input.url, repoPath], {
        remoteUrl: input.url,
      })
    } catch (error) {
      await rm(repoPath, { recursive: true, force: true })
      const detail = error instanceof Error ? error.message : String(error)
      throw new RepositoryCacheError(`Failed to clone ${input.url} (branch ${input.branch}): ${detail}`)
    }
    this.log(`[RepoCache] Cloned ${input.url} in ${Date.now() - startedAt}ms`)
  }

  private describeGitError(error: unknown): string {
    const err = error as NodeJS.ErrnoException & { stderr?: string; killed?: boolean }
    if (err.code === 'ENOENT') {
      return 'git executable not found'
    }
    if (err.killed) {
      return `timed out after ${GIT_TIMEOUT_MS / 1000}s`
    }
    const detail = (err.stderr || err.message || String(error)).trim()
    return this.redact(detail).slice(0, MAX_ERROR_DETAIL)
  }

  private redact(text: string): string {
    let result = text.replace(/Authorization:\s*Basic\s+\S+/gi, 'Authorization: Basic ***')

    // Redact GitHub App tokens (ghs_xxx format)
    result = result.replace(/ghs_[A-Za-z0-9_-]+/g, 'ghs_***')

    return result
  }

  private async withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = repoLocks.get(key) ?? Promise.resolve()
    const run = previous.then(task)
    const settled = run.then(
      () => undefined,
      () => undefined
    )
    repoLocks.set(key, settled)
    try {
      return await run
    } finally {
      if (repoLocks.get(key) === settled) {
        repoLocks.delete(key)
      }
    }
  }
}
