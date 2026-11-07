import { execFile, execFileSync } from 'node:child_process'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { InvalidRepositoryReferenceError, RepositoryCacheError } from '../../domain/exceptions/workflow.exceptions'
import { RepoCacheService, type GitExecOptions, type GitExecResult, type GitExecutor } from './repo-cache.service'

import type { IConfigService } from '@vyrak/custom-config'
import type { IGitHubAuthService } from '@vyrak/github-auth'

const ORG_ID = '11111111-1111-4111-8111-111111111111'
const PROJECT_ID = '22222222-2222-4222-8222-222222222222'
const GITHUB_APP_TOKEN = 'ghs_super_secret_github_app_token'
const INSTALLATION_ID = 12345678
const TOKEN_HEADER_VALUE = Buffer.from(`x-access-token:${GITHUB_APP_TOKEN}`).toString('base64')

type RecordedCall = { args: string[]; cwd?: string }

function runRealGit(args: string[], options: GitExecOptions): Promise<GitExecResult> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: options.cwd, env: options.env }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }))
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

function recordingExecutor(calls: RecordedCall[], delegate: GitExecutor = runRealGit): GitExecutor {
  return (args, options) => {
    calls.push({ args, cwd: options.cwd })
    return delegate(args, options)
  }
}

function createConfig(options: {
  mainReposPath: string
  autoFetch?: boolean
  installationId?: number
}): IConfigService {
  return {
    workspace: {
      mode: 'worktree',
      mainReposPath: options.mainReposPath,
      workspacesPath: path.join(options.mainReposPath, '..', 'workspaces'),
      cleanupOnSuccess: true,
      cleanupOnFailure: false,
      worktree: {
        baseBranch: 'main',
        branchPrefix: 'workflow/',
        autoFetch: options.autoFetch ?? true,
        autoCleanupBranch: true,
      },
    },
    git: {
      token: '',
      userName: 'vyrak-bot',
      userEmail: 'vyrak-bot@users.noreply.github.com',
      githubApp: options.installationId ? { installationId: options.installationId } : undefined,
    },
  } as unknown as IConfigService
}

function createMockGitHubAuthService(token: string = GITHUB_APP_TOKEN): IGitHubAuthService {
  return {
    getToken: vi.fn().mockResolvedValue(token),
  }
}

function git(args: string[], cwd?: string): string {
  return execFileSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.com', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

describe('RepoCacheService', () => {
  let tmpRoot: string
  let mainReposPath: string
  let bareRepoPath: string
  let bareRepoUrl: string
  let previousAppEnv: string | undefined

  beforeEach(async () => {
    previousAppEnv = process.env.APP_ENV
    process.env.APP_ENV = 'test'

    tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'repo-cache-spec-'))
    mainReposPath = path.join(tmpRoot, 'repos')
    bareRepoPath = path.join(tmpRoot, 'origin.git')
    bareRepoUrl = pathToFileURL(bareRepoPath).href

    git(['init', '--bare', '-b', 'main', bareRepoPath])
    const seedPath = path.join(tmpRoot, 'seed')
    git(['init', '-b', 'main', seedPath])
    await writeFile(path.join(seedPath, 'README.md'), 'hello\n')
    git(['add', '-A'], seedPath)
    git(['commit', '-m', 'initial'], seedPath)
    git(['remote', 'add', 'origin', bareRepoUrl], seedPath)
    git(['push', 'origin', 'main'], seedPath)
  })

  afterEach(async () => {
    if (previousAppEnv === undefined) {
      delete process.env.APP_ENV
    } else {
      process.env.APP_ENV = previousAppEnv
    }
    await rm(tmpRoot, { recursive: true, force: true })
  })

  const input = (overrides: Partial<{ repoName: string; url: string; branch: string }> = {}) => ({
    organizationId: ORG_ID,
    projectId: PROJECT_ID,
    repoName: 'app',
    url: bareRepoUrl,
    branch: 'main',
    ...overrides,
  })

  const subcommands = (calls: RecordedCall[]) =>
    calls.map((call) => call.args.find((arg) => arg === 'clone' || arg === 'fetch'))

  it('clones on the first call and only fetches on the second', async () => {
    const calls: RecordedCall[] = []
    const service = new RepoCacheService(createConfig({ mainReposPath }), createMockGitHubAuthService(), {
      exec: recordingExecutor(calls),
      log: () => undefined,
    })

    const first = await service.ensureRepo(input())
    const second = await service.ensureRepo(input())

    expect(first).toBe(path.join(mainReposPath, ORG_ID, PROJECT_ID, 'app'))
    expect(second).toBe(first)
    await expect(access(path.join(first, '.git'))).resolves.toBeUndefined()
    expect(subcommands(calls)).toEqual(['clone', 'fetch'])
  })

  it('picks up new upstream commits on fetch', async () => {
    const service = new RepoCacheService(createConfig({ mainReposPath }), createMockGitHubAuthService(), {
      log: () => undefined,
    })
    const repoPath = await service.ensureRepo(input())

    const seedPath = path.join(tmpRoot, 'seed')
    await writeFile(path.join(seedPath, 'second.txt'), 'two\n')
    git(['add', '-A'], seedPath)
    git(['commit', '-m', 'second'], seedPath)
    git(['push', 'origin', 'main'], seedPath)
    const upstreamSha = git(['rev-parse', 'main'], seedPath).trim()

    await service.ensureRepo(input())

    expect(git(['rev-parse', 'origin/main'], repoPath).trim()).toBe(upstreamSha)
  })

  it('skips fetch when autoFetch is disabled', async () => {
    const calls: RecordedCall[] = []
    const service = new RepoCacheService(
      createConfig({ mainReposPath, autoFetch: false }),
      createMockGitHubAuthService(),
      {
        exec: recordingExecutor(calls),
        log: () => undefined,
      }
    )

    await service.ensureRepo(input())
    await service.ensureRepo(input())

    expect(subcommands(calls)).toEqual(['clone'])
  })

  it('clones only once for concurrent calls on the same repository', async () => {
    const calls: RecordedCall[] = []
    const service = new RepoCacheService(createConfig({ mainReposPath }), createMockGitHubAuthService(), {
      exec: recordingExecutor(calls),
      log: () => undefined,
    })

    const results = await Promise.all([
      service.ensureRepo(input()),
      service.ensureRepo(input()),
      service.ensureRepo(input()),
      service.ensureRepo(input()),
    ])

    expect(new Set(results).size).toBe(1)
    const subs = subcommands(calls)
    expect(subs.filter((sub) => sub === 'clone')).toHaveLength(1)
    expect(subs.filter((sub) => sub === 'fetch')).toHaveLength(3)
    expect(subs[0]).toBe('clone')
  })

  it('does not run git commands for the same repository at the same time', async () => {
    let running = 0
    let maxRunning = 0
    const exec: GitExecutor = async (args, options) => {
      running += 1
      maxRunning = Math.max(maxRunning, running)
      try {
        return await runRealGit(args, options)
      } finally {
        running -= 1
      }
    }
    const service = new RepoCacheService(createConfig({ mainReposPath }), createMockGitHubAuthService(), {
      exec,
      log: () => undefined,
    })

    await Promise.all([service.ensureRepo(input()), service.ensureRepo(input()), service.ensureRepo(input())])

    expect(maxRunning).toBe(1)
  })

  it('keeps serving later calls after an earlier call for the same repository failed', async () => {
    const service = new RepoCacheService(createConfig({ mainReposPath }), createMockGitHubAuthService(), {
      log: () => undefined,
    })

    await expect(service.ensureRepo(input({ branch: 'does-not-exist' }))).rejects.toBeInstanceOf(RepositoryCacheError)
    const repoPath = await service.ensureRepo(input())

    await expect(access(path.join(repoPath, '.git'))).resolves.toBeUndefined()
  })

  it.each(['../evil', '..', '.', 'a/b', 'a b', '', 'name;rm'])('rejects repoName %j', async (repoName) => {
    const service = new RepoCacheService(createConfig({ mainReposPath }), createMockGitHubAuthService(), {
      log: () => undefined,
    })

    await expect(service.ensureRepo(input({ repoName }))).rejects.toBeInstanceOf(InvalidRepositoryReferenceError)
  })

  it('rejects organization and project ids that traverse directories', async () => {
    const service = new RepoCacheService(createConfig({ mainReposPath }), createMockGitHubAuthService(), {
      log: () => undefined,
    })

    await expect(service.ensureRepo({ ...input(), organizationId: '../x' })).rejects.toBeInstanceOf(
      InvalidRepositoryReferenceError
    )
    await expect(service.ensureRepo({ ...input(), projectId: '..' })).rejects.toBeInstanceOf(
      InvalidRepositoryReferenceError
    )
  })

  it.each([
    ['ext transport', 'ext::sh -c touch% /tmp/pwned'],
    ['option-like url', '--upload-pack=touch /tmp/pwned'],
    ['plain http', 'http://example.com/org/repo.git'],
    ['ssh', 'ssh://git@example.com/org/repo.git'],
    ['credentials in url', 'https://user:secret@example.com/org/repo.git'],
    ['not a url', 'just-a-name'],
  ])('rejects url: %s', async (_label, url) => {
    const calls: RecordedCall[] = []
    const service = new RepoCacheService(createConfig({ mainReposPath }), createMockGitHubAuthService(), {
      exec: recordingExecutor(calls),
      log: () => undefined,
    })

    await expect(service.ensureRepo(input({ url }))).rejects.toBeInstanceOf(InvalidRepositoryReferenceError)
    expect(calls).toHaveLength(0)
  })

  it.each(['--orphan', 'a..b', 'main;ls', 'feat branch'])('rejects branch %j', async (branch) => {
    const service = new RepoCacheService(createConfig({ mainReposPath }), createMockGitHubAuthService(), {
      log: () => undefined,
    })

    await expect(service.ensureRepo(input({ branch }))).rejects.toBeInstanceOf(InvalidRepositoryReferenceError)
  })

  it('rejects file urls outside local and test environments', async () => {
    process.env.APP_ENV = 'production'
    const service = new RepoCacheService(createConfig({ mainReposPath }), createMockGitHubAuthService(), {
      log: () => undefined,
    })

    await expect(service.ensureRepo(input())).rejects.toBeInstanceOf(InvalidRepositoryReferenceError)
  })

  it('sends the GitHub App token as a per-command header for https and never writes it to .git/config', async () => {
    const calls: RecordedCall[] = []
    const mockAuth = createMockGitHubAuthService()
    // Stand-in for the network: redirect the https remote to the local bare repo and keep every other argument,
    // including the Authorization header, exactly as the service produced it.
    const httpsUrl = 'https://git.example.com/acme/app.git'
    const redirectToBareRepo: GitExecutor = (args, options) =>
      runRealGit(
        args.map((arg) => (arg === httpsUrl ? bareRepoUrl : arg)),
        options
      )
    const service = new RepoCacheService(createConfig({ mainReposPath, installationId: INSTALLATION_ID }), mockAuth, {
      exec: recordingExecutor(calls, redirectToBareRepo),
      log: () => undefined,
    })

    const repoPath = await service.ensureRepo(input({ url: httpsUrl }))
    await service.ensureRepo(input({ url: httpsUrl }))

    expect(mockAuth.getToken).toHaveBeenCalledWith(INSTALLATION_ID)
    for (const call of calls) {
      expect(call.args).toContain(`http.extraHeader=Authorization: Basic ${TOKEN_HEADER_VALUE}`)
      expect(call.args.filter((arg) => arg.includes(GITHUB_APP_TOKEN))).toHaveLength(0)
      expect(call.args.some((arg) => arg.startsWith('https://') && arg.includes('@'))).toBe(false)
    }

    const gitConfig = await readFile(path.join(repoPath, '.git', 'config'), 'utf8')
    expect(gitConfig).not.toContain(GITHUB_APP_TOKEN)
    expect(gitConfig).not.toContain(TOKEN_HEADER_VALUE)
    expect(gitConfig.toLowerCase()).not.toContain('extraheader')
  })

  it('throws error when GitHub App authentication is not configured for https remotes', async () => {
    const calls: RecordedCall[] = []
    const httpsUrl = 'https://git.example.com/acme/app.git'
    const redirectToBareRepo: GitExecutor = (args, options) =>
      runRealGit(
        args.map((arg) => (arg === httpsUrl ? bareRepoUrl : arg)),
        options
      )
    const service = new RepoCacheService(createConfig({ mainReposPath }), createMockGitHubAuthService(), {
      exec: recordingExecutor(calls, redirectToBareRepo),
      log: () => undefined,
    })

    await expect(service.ensureRepo(input({ url: httpsUrl }))).rejects.toThrow(
      'GitHub App installation ID not configured'
    )
  })

  it('does not send the token to non-https remotes', async () => {
    const calls: RecordedCall[] = []
    const service = new RepoCacheService(
      createConfig({ mainReposPath, installationId: INSTALLATION_ID }),
      createMockGitHubAuthService(),
      {
        exec: recordingExecutor(calls),
        log: () => undefined,
      }
    )

    await service.ensureRepo(input())

    expect(calls.every((call) => !call.args.some((arg) => arg.includes('extraHeader')))).toBe(true)
  })

  it('removes the half-cloned directory and hides the token when clone fails', async () => {
    const failingExec: GitExecutor = async (args) => {
      const target = args[args.length - 1]
      await writeFile(path.join(path.dirname(target), 'marker'), 'x').catch(() => undefined)
      throw Object.assign(new Error('Command failed'), {
        stderr: `fatal: unable to access: Authorization: Basic ${TOKEN_HEADER_VALUE} token=${GITHUB_APP_TOKEN}`,
      })
    }
    const service = new RepoCacheService(
      createConfig({ mainReposPath, installationId: INSTALLATION_ID }),
      createMockGitHubAuthService(),
      {
        exec: failingExec,
        log: () => undefined,
      }
    )
    const expectedPath = path.join(mainReposPath, ORG_ID, PROJECT_ID, 'app')

    const error = await service
      .ensureRepo(input({ url: 'https://git.example.com/acme/app.git' }))
      .then(() => null)
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(RepositoryCacheError)
    const message = (error as Error).message
    expect(message).not.toContain(GITHUB_APP_TOKEN)
    expect(message).not.toContain(TOKEN_HEADER_VALUE)
    expect(message).toContain('Failed to clone')
    await expect(access(expectedPath)).rejects.toThrow()
  })

  it('replaces the leftover of an interrupted clone', async () => {
    const service = new RepoCacheService(createConfig({ mainReposPath }), createMockGitHubAuthService(), {
      log: () => undefined,
    })
    const expectedPath = path.join(mainReposPath, ORG_ID, PROJECT_ID, 'app')
    await mkdir(expectedPath, { recursive: true })
    await writeFile(path.join(expectedPath, 'partial.tmp'), 'partial')

    await service.ensureRepo(input())

    await expect(access(path.join(expectedPath, '.git'))).resolves.toBeUndefined()
    await expect(access(path.join(expectedPath, 'partial.tmp'))).rejects.toThrow()
  })

  it('runGit reports failures without leaking the token', async () => {
    const exec: GitExecutor = async () => {
      throw Object.assign(new Error('boom'), { stderr: `denied for ${GITHUB_APP_TOKEN}` })
    }
    const service = new RepoCacheService(
      createConfig({ mainReposPath, installationId: INSTALLATION_ID }),
      createMockGitHubAuthService(),
      {
        exec,
        log: () => undefined,
      }
    )

    const error = await service
      .runGit(['push', 'origin', 'main'], { cwd: tmpRoot, remoteUrl: 'https://git.example.com/acme/app.git' })
      .then(() => null)
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(RepositoryCacheError)
    expect((error as Error).message).not.toContain(GITHUB_APP_TOKEN)
  })
})
