import { execSync } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { MainRepoManager } from '../../main-repo-manager.service'
import { WorkspaceManager } from '../../workspace-manager.service'

/**
 * Integration tests for worktree creation
 *
 * These tests use real git operations with a small public repository
 */
describe('WorkspaceManager - Worktree Integration', () => {
  let mainRepoManager: MainRepoManager
  let workspaceManager: WorkspaceManager

  const testBasePath = '/tmp/vyrak-test-worktree-integration'
  const testReposPath = '/tmp/vyrak-test-repos-integration'
  const testRepoUrl = 'https://github.com/zeit/ms.git' // Small, stable repo (~100KB)
  const createdWorkspaces: string[] = []

  beforeAll(async () => {
    // Clean up test directories
    await fs.rm(testBasePath, { recursive: true, force: true })
    await fs.rm(testReposPath, { recursive: true, force: true })

    // Create managers
    mainRepoManager = new MainRepoManager(testReposPath)
    workspaceManager = new WorkspaceManager(testBasePath, mainRepoManager)

    // Ensure main repo exists (this will be shared by all tests)
    await mainRepoManager.ensureMainRepo('zeit', 'ms', testRepoUrl, {
      depth: 1,
    })
  })

  afterEach(async () => {
    // Cleanup created workspaces
    for (const runId of createdWorkspaces) {
      try {
        await workspaceManager.cleanupWorkspace(runId)
      } catch (error) {
        console.error(`Failed to cleanup workspace ${runId}:`, error)
      }
    }
    createdWorkspaces.length = 0
  })

  afterAll(async () => {
    // Full cleanup
    await fs.rm(testBasePath, { recursive: true, force: true })
    await fs.rm(testReposPath, { recursive: true, force: true })
  })

  it('should create real worktree workspace', async () => {
    const runId = 'integration-test-001'
    createdWorkspaces.push(runId)

    const startTime = Date.now()

    const workspace = await workspaceManager.createWorkspaceWithWorktree(
      runId,
      testRepoUrl,
      'main' // Changed from 'main' to 'main'
    )

    const duration = Date.now() - startTime

    // Verify workspace structure
    expect(workspace.isWorktree).toBe(true)
    expect(workspace.branchName).toBe(`workflow/${runId}`)
    expect(workspace.mainRepoPath).toBeDefined()

    // Verify workspace directory exists
    const stats = await fs.stat(workspace.path)
    expect(stats.isDirectory()).toBe(true)

    // Verify repo directory exists
    const repoStats = await fs.stat(path.join(workspace.path, 'repo'))
    expect(repoStats.isDirectory()).toBe(true)

    // Verify artifacts directory exists
    const artifactsStats = await fs.stat(path.join(workspace.path, 'artifacts'))
    expect(artifactsStats.isDirectory()).toBe(true)

    // Verify it's a valid git repository
    const gitStatus = execSync('git status', {
      cwd: path.join(workspace.path, 'repo'),
      encoding: 'utf-8',
    })
    expect(gitStatus).toContain('On branch')

    // Verify branch name
    const branch = execSync('git branch --show-current', {
      cwd: path.join(workspace.path, 'repo'),
      encoding: 'utf-8',
    }).trim()
    expect(branch).toBe(`workflow/${runId}`)

    // Verify performance (should be fast)
    console.log(`Worktree creation time: ${duration}ms`)
    expect(duration).toBeLessThan(5000) // Should be under 5 seconds

    // Verify repository content
    const packageJsonExists = await fs
      .access(path.join(workspace.path, 'repo', 'package.json'))
      .then(() => true)
      .catch(() => false)
    expect(packageJsonExists).toBe(true)
  }, 30000) // 30s timeout

  it('should create multiple parallel worktrees', async () => {
    const runIds = Array.from({ length: 5 }, (_, i) => `parallel-test-${i}`)
    createdWorkspaces.push(...runIds)

    const startTime = Date.now()

    // Create 5 worktrees in parallel
    const promises = runIds.map((runId) => workspaceManager.createWorkspaceWithWorktree(runId, testRepoUrl, 'main'))

    const workspaces = await Promise.all(promises)

    const duration = Date.now() - startTime

    // Verify all created successfully
    expect(workspaces).toHaveLength(5)

    // Verify unique branches
    const branches = new Set(workspaces.map((w) => w.branchName))
    expect(branches.size).toBe(5)

    // Verify all are worktrees
    expect(workspaces.every((w) => w.isWorktree)).toBe(true)

    // Verify all directories exist
    for (const workspace of workspaces) {
      const exists = await fs
        .access(workspace.path)
        .then(() => true)
        .catch(() => false)
      expect(exists).toBe(true)
    }

    console.log(`Parallel worktree creation time: ${duration}ms`)
    console.log(`Average per worktree: ${(duration / 5).toFixed(0)}ms`)

    // Verify no conflicts
    expect(duration).toBeLessThan(15000) // 5 worktrees in < 15s
  }, 60000) // 60s timeout

  it('should isolate changes between worktrees', async () => {
    const runId1 = 'isolation-test-1'
    const runId2 = 'isolation-test-2'
    createdWorkspaces.push(runId1, runId2)

    // Create two worktrees
    const ws1 = await workspaceManager.createWorkspaceWithWorktree(runId1, testRepoUrl, 'main')
    const ws2 = await workspaceManager.createWorkspaceWithWorktree(runId2, testRepoUrl, 'main')

    // Modify file in ws1
    const testFilePath1 = path.join(ws1.path, 'repo', 'test-file.txt')
    await fs.writeFile(testFilePath1, 'hello from workspace 1')

    // Verify file exists in ws1
    const existsInWs1 = await fs
      .access(testFilePath1)
      .then(() => true)
      .catch(() => false)
    expect(existsInWs1).toBe(true)

    // Verify file does NOT exist in ws2
    const testFilePath2 = path.join(ws2.path, 'repo', 'test-file.txt')
    const existsInWs2 = await fs
      .access(testFilePath2)
      .then(() => true)
      .catch(() => false)
    expect(existsInWs2).toBe(false)

    // Verify git status in ws1 shows untracked file
    const status1 = execSync('git status --porcelain', {
      cwd: path.join(ws1.path, 'repo'),
      encoding: 'utf-8',
    })
    expect(status1).toContain('test-file.txt')

    // Verify git status in ws2 is clean
    const status2 = execSync('git status --porcelain', {
      cwd: path.join(ws2.path, 'repo'),
      encoding: 'utf-8',
    })
    expect(status2).not.toContain('test-file.txt')
  }, 30000)

  it('should list worktrees correctly', async () => {
    const runIds = ['list-test-1', 'list-test-2', 'list-test-3']
    createdWorkspaces.push(...runIds)

    // Create worktrees
    await Promise.all(runIds.map((runId) => workspaceManager.createWorkspaceWithWorktree(runId, testRepoUrl, 'main')))

    // List worktrees
    const worktrees = await workspaceManager.listWorktrees('zeit', 'ms')

    // Should include at least our 3 worktrees
    expect(worktrees.length).toBeGreaterThanOrEqual(3)

    // Verify our worktrees are in the list
    const ourWorktrees = worktrees.filter((wt) => runIds.includes(wt.runId))
    expect(ourWorktrees).toHaveLength(3)

    // Verify worktree properties
    for (const worktree of ourWorktrees) {
      expect(worktree.branch).toMatch(/^workflow\/list-test-\d+$/)
      expect(worktree.path).toContain(testBasePath)
      expect(worktree.isLocked).toBe(false)
      expect(worktree.isPrunable).toBe(false)
      expect(worktree.createdAt).toBeInstanceOf(Date)
    }
  }, 30000)

  it('should cleanup worktree correctly', async () => {
    const runId = 'cleanup-test-001'

    // Create worktree
    const workspace = await workspaceManager.createWorkspaceWithWorktree(runId, testRepoUrl, 'main')

    // Verify exists
    const existsBefore = await fs
      .access(workspace.path)
      .then(() => true)
      .catch(() => false)
    expect(existsBefore).toBe(true)

    // Cleanup
    await workspaceManager.cleanupWorkspace(runId)

    // Verify removed
    const existsAfter = await fs
      .access(workspace.path)
      .then(() => true)
      .catch(() => false)
    expect(existsAfter).toBe(false)

    // Note: Worktree reference in main repo should be cleaned by Story 3.5.3
    // For now, we just verify the workspace directory is removed
  }, 30000)

  it('should handle force recreate', async () => {
    const runId = 'force-test-001'
    createdWorkspaces.push(runId)

    // Create first time
    const first = await workspaceManager.createWorkspaceWithWorktree(runId, testRepoUrl, 'main')

    // Add a file
    const markerPath = path.join(first.path, 'artifacts', 'marker.txt')
    await fs.writeFile(markerPath, 'first creation')

    // Verify marker exists
    const existsFirst = await fs
      .access(markerPath)
      .then(() => true)
      .catch(() => false)
    expect(existsFirst).toBe(true)

    // Recreate with force
    const second = await workspaceManager.createWorkspaceWithWorktree(runId, testRepoUrl, 'main', { force: true })

    expect(second.path).toBe(first.path)

    // Verify marker is gone (workspace was recreated)
    const existsSecond = await fs
      .access(markerPath)
      .then(() => true)
      .catch(() => false)
    expect(existsSecond).toBe(false)
  }, 30000)

  it('should use custom branch name', async () => {
    const runId = 'custom-branch-test'
    const customBranch = 'feature/custom-test-branch'
    createdWorkspaces.push(runId)

    const workspace = await workspaceManager.createWorkspaceWithWorktree(runId, testRepoUrl, 'main', {
      newBranch: customBranch,
    })

    expect(workspace.branchName).toBe(customBranch)

    // Verify actual branch in git
    const branch = execSync('git branch --show-current', {
      cwd: path.join(workspace.path, 'repo'),
      encoding: 'utf-8',
    }).trim()
    expect(branch).toBe(customBranch)
  }, 30000)
})
