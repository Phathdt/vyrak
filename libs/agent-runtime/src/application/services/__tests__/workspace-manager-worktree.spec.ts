import * as fs from 'node:fs'
import * as path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkspaceCreationError } from '../../../domain/errors/agent-execution.errors'
import type { IMainRepoManager } from '../../../domain/interfaces/main-repo-manager.interface'
import { WorkspaceManager } from '../workspace-manager.service'

// Mock child_process module
vi.mock('node:child_process', () => ({
  execSync: vi.fn((command: string, options?: any) => {
    // Check if encoding is specified
    if (options?.encoding === 'utf-8') {
      // Return string for utf-8 encoding
      if (command.includes('git worktree list --porcelain')) {
        return ''
      }
      return ''
    }
    // Return Buffer by default
    if (command.includes('git worktree add')) {
      return Buffer.from('')
    }
    if (command.includes('git worktree list --porcelain')) {
      return Buffer.from('')
    }
    if (command.includes('git worktree remove')) {
      return Buffer.from('')
    }
    if (command.includes('git branch -D')) {
      return Buffer.from('')
    }
    return Buffer.from('')
  }),
}))

describe('WorkspaceManager - Worktree', () => {
  let manager: WorkspaceManager
  let mockMainRepoManager: IMainRepoManager
  let mockExecSync: ReturnType<typeof vi.fn>
  const testBasePath = '/tmp/vyrak-test-worktree-workspaces'
  const testRunId = 'test-run-worktree-123'
  const testRepoUrl = 'https://github.com/test-org/test-repo.git'
  const testMainRepoPath = '/var/vyrak/repos/test-org/test-repo/main-repo'

  beforeEach(async () => {
    // Clean up test directory
    if (fs.existsSync(testBasePath)) {
      fs.rmSync(testBasePath, { recursive: true, force: true })
    }

    // Get mock from module
    const childProcess = await import('node:child_process')
    mockExecSync = vi.mocked(childProcess.execSync)
    mockExecSync.mockClear()

    // Create mock main repo manager
    mockMainRepoManager = {
      ensureMainRepo: vi.fn().mockResolvedValue(testMainRepoPath),
      updateMainRepo: vi.fn().mockResolvedValue(undefined),
      mainRepoExists: vi.fn().mockResolvedValue(true),
      getMainRepoPath: vi.fn().mockReturnValue(testMainRepoPath),
      checkRepoHealth: vi.fn().mockResolvedValue({
        healthy: true,
        path: testMainRepoPath,
        exists: true,
        isGitRepo: true,
        hasRemote: true,
        diskUsage: 1000000,
        issues: [],
      }),
      deleteMainRepo: vi.fn().mockResolvedValue(undefined),
    }

    manager = new WorkspaceManager(testBasePath, mockMainRepoManager)
  })

  afterEach(() => {
    vi.clearAllMocks()
    if (fs.existsSync(testBasePath)) {
      fs.rmSync(testBasePath, { recursive: true, force: true })
    }
  })

  describe('createWorkspaceWithWorktree', () => {
    it('should create worktree workspace successfully', async () => {
      const workspace = await manager.createWorkspaceWithWorktree(testRunId, testRepoUrl, 'main')

      expect(workspace.isWorktree).toBe(true)
      expect(workspace.branchName).toBe(`workflow/${testRunId}`)
      expect(workspace.mainRepoPath).toBe(testMainRepoPath)
      expect(workspace.runId).toBe(testRunId)
      expect(workspace.repoUrl).toBe(testRepoUrl)
      expect(workspace.branch).toBe('main')
      expect(workspace.createdAt).toBeInstanceOf(Date)

      // Verify mainRepoManager was called
      expect(mockMainRepoManager.ensureMainRepo).toHaveBeenCalledWith('test-org', 'test-repo', testRepoUrl, {
        fetchBeforeUse: true,
      })

      // Verify workspace directory created
      expect(fs.existsSync(workspace.path)).toBe(true)
      expect(fs.existsSync(path.join(workspace.path, 'artifacts'))).toBe(true)

      // Verify metadata saved
      const metadataPath = path.join(workspace.path, '.metadata.json')
      expect(fs.existsSync(metadataPath)).toBe(true)

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
      expect(metadata.isWorktree).toBe(true)
      expect(metadata.branchName).toBe(`workflow/${testRunId}`)
      expect(metadata.mainRepoPath).toBe(testMainRepoPath)
    })

    it('should use custom branch name', async () => {
      const customBranch = 'feature/custom-branch'

      const workspace = await manager.createWorkspaceWithWorktree(testRunId, testRepoUrl, 'main', {
        newBranch: customBranch,
      })

      expect(workspace.branchName).toBe(customBranch)

      // Verify git command used custom branch
      expect(mockExecSync).toHaveBeenCalledWith(expect.stringContaining(`-b ${customBranch}`), expect.any(Object))
    })

    it('should use custom branch prefix', async () => {
      const workspace = await manager.createWorkspaceWithWorktree(testRunId, testRepoUrl, 'main', {
        branchPrefix: 'task/',
      })

      expect(workspace.branchName).toBe(`task/${testRunId}`)
    })

    it('should throw when workspace already exists and force=false', async () => {
      // Create workspace first
      await manager.createWorkspaceWithWorktree(testRunId, testRepoUrl, 'main')

      // Try to create again
      await expect(manager.createWorkspaceWithWorktree(testRunId, testRepoUrl, 'main')).rejects.toThrow(
        WorkspaceCreationError
      )
      await expect(manager.createWorkspaceWithWorktree(testRunId, testRepoUrl, 'main')).rejects.toThrow(
        'already exists'
      )
    })

    it('should recreate when force=true', async () => {
      // Create workspace first
      const first = await manager.createWorkspaceWithWorktree(testRunId, testRepoUrl, 'main')

      // Write a test file
      fs.writeFileSync(path.join(first.path, 'test.txt'), 'test content')

      // Recreate with force
      const second = await manager.createWorkspaceWithWorktree(testRunId, testRepoUrl, 'main', { force: true })

      expect(second.path).toBe(first.path)
      expect(fs.existsSync(path.join(second.path, 'test.txt'))).toBe(false)
    })

    it('should disable auto-fetch when autoFetch=false', async () => {
      await manager.createWorkspaceWithWorktree(testRunId, testRepoUrl, 'main', {
        autoFetch: false,
      })

      expect(mockMainRepoManager.ensureMainRepo).toHaveBeenCalledWith('test-org', 'test-repo', testRepoUrl, {
        fetchBeforeUse: false,
      })
    })

    it('should throw when MainRepoManager is not provided', async () => {
      const managerWithoutMainRepo = new WorkspaceManager(testBasePath)

      await expect(managerWithoutMainRepo.createWorkspaceWithWorktree(testRunId, testRepoUrl, 'main')).rejects.toThrow(
        'MainRepoManager is required'
      )
    })

    it('should cleanup on git worktree failure', async () => {
      const workspacePath = manager.getWorkspacePath(testRunId)

      // Mock: first call (worktreeExists check) returns empty, second call (worktree add) throws
      mockExecSync
        .mockReturnValueOnce('') // worktreeExists check
        .mockImplementationOnce(() => {
          throw new Error('Git worktree add failed')
        })

      await expect(manager.createWorkspaceWithWorktree(testRunId, testRepoUrl, 'main')).rejects.toThrow(
        WorkspaceCreationError
      )

      // Workspace should be cleaned up
      expect(fs.existsSync(workspacePath)).toBe(false)
    })

    it('should parse GitHub HTTPS URL correctly', async () => {
      await manager.createWorkspaceWithWorktree(testRunId, 'https://github.com/vyrak/ai-sdlc.git', 'main')

      expect(mockMainRepoManager.ensureMainRepo).toHaveBeenCalledWith(
        'vyrak',
        'ai-sdlc',
        'https://github.com/vyrak/ai-sdlc.git',
        expect.any(Object)
      )
    })

    it('should parse GitHub SSH URL correctly', async () => {
      await manager.createWorkspaceWithWorktree(testRunId, 'git@github.com:vyrak/ai-sdlc.git', 'main')

      expect(mockMainRepoManager.ensureMainRepo).toHaveBeenCalledWith(
        'vyrak',
        'ai-sdlc',
        'git@github.com:vyrak/ai-sdlc.git',
        expect.any(Object)
      )
    })

    it('should handle non-GitHub URLs with fallback', async () => {
      const customUrl = 'https://gitlab.com/custom/repo.git'

      await manager.createWorkspaceWithWorktree(testRunId, customUrl, 'main')

      // Should use fallback with hash
      expect(mockMainRepoManager.ensureMainRepo).toHaveBeenCalledWith(
        'default',
        expect.any(String), // MD5 hash
        customUrl,
        expect.any(Object)
      )
    })
  })

  describe('listWorktrees', () => {
    it('should return empty array when main repo does not exist', async () => {
      vi.mocked(mockMainRepoManager.mainRepoExists).mockResolvedValue(false)

      const worktrees = await manager.listWorktrees('test-org', 'test-repo')

      expect(worktrees).toEqual([])
    })

    it('should parse and return worktree list', async () => {
      const mockOutput = `worktree /tmp/vyrak-workspaces/run-001/repo
branch refs/heads/workflow/run-001

worktree /tmp/vyrak-workspaces/run-002/repo
branch refs/heads/workflow/run-002
locked

worktree /tmp/vyrak-workspaces/run-003/repo
branch refs/heads/workflow/run-003
prunable

`

      // Return string when encoding is utf-8
      mockExecSync.mockReturnValueOnce(mockOutput)

      const worktrees = await manager.listWorktrees('test-org', 'test-repo')

      expect(worktrees).toHaveLength(3)

      expect(worktrees[0].runId).toBe('run-001')
      expect(worktrees[0].branch).toBe('workflow/run-001')
      expect(worktrees[0].isLocked).toBe(false)
      expect(worktrees[0].isPrunable).toBe(false)

      expect(worktrees[1].runId).toBe('run-002')
      expect(worktrees[1].isLocked).toBe(true)

      expect(worktrees[2].runId).toBe('run-003')
      expect(worktrees[2].isPrunable).toBe(true)
    })

    it('should handle git command failure gracefully', async () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Git command failed')
      })

      const worktrees = await manager.listWorktrees('test-org', 'test-repo')

      expect(worktrees).toEqual([])
    })

    it('should return empty array when MainRepoManager not provided', async () => {
      const managerWithoutMainRepo = new WorkspaceManager(testBasePath)

      const worktrees = await managerWithoutMainRepo.listWorktrees('test-org', 'test-repo')

      expect(worktrees).toEqual([])
    })

    it('should handle worktrees without workflow prefix', async () => {
      const mockOutput = `worktree /tmp/vyrak-workspaces/custom/repo
branch refs/heads/feature/custom-branch

`

      mockExecSync.mockReturnValueOnce(mockOutput)

      const worktrees = await manager.listWorktrees('test-org', 'test-repo')

      expect(worktrees).toHaveLength(1)
      expect(worktrees[0].runId).toBe('unknown')
      expect(worktrees[0].branch).toBe('feature/custom-branch')
    })
  })
})
