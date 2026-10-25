import * as fs from 'node:fs'
import * as path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { MainRepoManager } from '../../main-repo-manager.service'
import { WorkspaceManager } from '../../workspace-manager.service'

describe('WorkspaceManager Integration', () => {
  let manager: WorkspaceManager
  let mainRepoManager: MainRepoManager
  const testBasePath = '/tmp/vyrak-integration-test'
  const testMainReposPath = '/tmp/vyrak-integration-main-repos'
  const testRunId = `integration-test-${Date.now()}`

  // Use a public test repository
  const testRepoUrl = 'https://github.com/octocat/Hello-World.git'
  const testBranch = 'master'

  beforeAll(() => {
    mainRepoManager = new MainRepoManager(testMainReposPath)
    manager = new WorkspaceManager(testBasePath, mainRepoManager)
  })

  afterAll(async () => {
    // Cleanup all test workspaces
    if (fs.existsSync(testBasePath)) {
      fs.rmSync(testBasePath, { recursive: true, force: true })
    }
    // Cleanup main repos
    if (fs.existsSync(testMainReposPath)) {
      fs.rmSync(testMainReposPath, { recursive: true, force: true })
    }
  })

  it('should create workspace with real git clone', async () => {
    const workspacePath = await manager.createWorkspace(testRunId, testRepoUrl, testBranch)

    expect(fs.existsSync(workspacePath)).toBe(true)

    const repoPath = manager.getRepoPath(testRunId)
    expect(fs.existsSync(repoPath)).toBe(true)

    // Verify git worktree (has .git file pointing to main repo)
    const gitPath = path.join(repoPath, '.git')
    expect(fs.existsSync(gitPath)).toBe(true)

    // Verify artifacts directory
    const artifactsPath = manager.getArtifactsPath(testRunId)
    expect(fs.existsSync(artifactsPath)).toBe(true)

    // Verify metadata file
    const metadataPath = path.join(workspacePath, '.metadata.json')
    expect(fs.existsSync(metadataPath)).toBe(true)

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
    expect(metadata.runId).toBe(testRunId)
    expect(metadata.repoUrl).toBe(testRepoUrl)
    expect(metadata.branch).toBeDefined() // Worktree creates unique branch
    expect(metadata.createdAt).toBeDefined()

    // Verify README exists (Hello-World has a README)
    const readmePath = path.join(repoPath, 'README')
    expect(fs.existsSync(readmePath)).toBe(true)
  }, 60000) // 60s timeout for git operations

  it('should list workspaces', async () => {
    const workspaces = await manager.listWorkspaces()

    expect(workspaces.length).toBeGreaterThan(0)

    const workspace = workspaces.find((w) => w.runId === testRunId)
    expect(workspace).toBeDefined()
    expect(workspace?.repoUrl).toBe(testRepoUrl)
    expect(workspace?.branch).toBe(testBranch)
    expect(workspace?.createdAt).toBeInstanceOf(Date)
  })

  it('should cleanup workspace', async () => {
    await manager.cleanupWorkspace(testRunId)

    const workspacePath = manager.getWorkspacePath(testRunId)
    expect(fs.existsSync(workspacePath)).toBe(false)
  })

  it('should handle invalid repository URL gracefully', async () => {
    const invalidRunId = `invalid-test-${Date.now()}`
    const invalidRepoUrl = 'https://github.com/invalid-org-xyz/non-existent-repo-xyz.git'

    await expect(manager.createWorkspace(invalidRunId, invalidRepoUrl, 'main')).rejects.toThrow()

    // Verify workspace was cleaned up after failure
    const workspacePath = manager.getWorkspacePath(invalidRunId)
    expect(fs.existsSync(workspacePath)).toBe(false)
  }, 30000)

  it('should handle invalid branch gracefully', async () => {
    const invalidBranchRunId = `invalid-branch-test-${Date.now()}`
    const invalidBranch = 'non-existent-branch-xyz-123'

    await expect(manager.createWorkspace(invalidBranchRunId, testRepoUrl, invalidBranch)).rejects.toThrow()

    // Verify workspace was cleaned up after failure
    const workspacePath = manager.getWorkspacePath(invalidBranchRunId)
    expect(fs.existsSync(workspacePath)).toBe(false)
  }, 30000)
})
