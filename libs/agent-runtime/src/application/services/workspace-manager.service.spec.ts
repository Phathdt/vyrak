import * as fs from 'node:fs'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkspaceCleanupError, WorkspaceCreationError } from '../../domain'
import { WorkspaceManager } from './workspace-manager.service'

describe('WorkspaceManager', () => {
  let manager: WorkspaceManager
  const testBasePath = '/tmp/vyrak-test-workspaces'
  const testRunId = 'test-run-123'

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testBasePath)) {
      fs.rmSync(testBasePath, { recursive: true, force: true })
    }

    manager = new WorkspaceManager(testBasePath)
  })

  afterEach(async () => {
    // Cleanup after tests
    if (fs.existsSync(testBasePath)) {
      fs.rmSync(testBasePath, { recursive: true, force: true })
    }
  })

  describe('constructor', () => {
    it('should create base workspace directory', () => {
      expect(fs.existsSync(testBasePath)).toBe(true)
    })

    it('should use default path when not provided', () => {
      const defaultManager = new WorkspaceManager()
      expect(defaultManager.getWorkspacePath('test')).toContain('/tmp/vyrak-workspaces')
    })
  })

  describe('getWorkspacePath', () => {
    it('should return correct workspace path', () => {
      const workspacePath = manager.getWorkspacePath(testRunId)
      expect(workspacePath).toBe(`${testBasePath}/${testRunId}`)
    })
  })

  describe('getRepoPath', () => {
    it('should return correct repo path', () => {
      const repoPath = manager.getRepoPath(testRunId)
      expect(repoPath).toBe(`${testBasePath}/${testRunId}/repo`)
    })
  })

  describe('getArtifactsPath', () => {
    it('should return correct artifacts path', () => {
      const artifactsPath = manager.getArtifactsPath(testRunId)
      expect(artifactsPath).toBe(`${testBasePath}/${testRunId}/artifacts`)
    })
  })

  describe('createWorkspace', () => {
    it('should throw error if workspace already exists', async () => {
      const workspacePath = manager.getWorkspacePath(testRunId)
      fs.mkdirSync(workspacePath, { recursive: true })

      await expect(manager.createWorkspace(testRunId, 'https://example.com/repo.git', 'main')).rejects.toThrow(
        WorkspaceCreationError
      )
    })

    it('should cleanup on git clone failure', async () => {
      const workspacePath = manager.getWorkspacePath(testRunId)

      await expect(
        manager.createWorkspace(testRunId, 'https://invalid-url-that-will-fail.com/repo.git', 'main')
      ).rejects.toThrow(WorkspaceCreationError)

      // Workspace should be cleaned up
      expect(fs.existsSync(workspacePath)).toBe(false)
    })
  })

  describe('cleanupWorkspace', () => {
    it('should remove workspace directory', async () => {
      const workspacePath = manager.getWorkspacePath(testRunId)
      fs.mkdirSync(workspacePath, { recursive: true })

      await manager.cleanupWorkspace(testRunId)

      expect(fs.existsSync(workspacePath)).toBe(false)
    })

    it('should not throw if workspace does not exist', async () => {
      await expect(manager.cleanupWorkspace('non-existent')).resolves.not.toThrow()
    })

    it('should remove nested directories', async () => {
      const workspacePath = manager.getWorkspacePath(testRunId)
      const repoPath = path.join(workspacePath, 'repo')
      const artifactsPath = path.join(workspacePath, 'artifacts')

      fs.mkdirSync(repoPath, { recursive: true })
      fs.mkdirSync(artifactsPath, { recursive: true })
      fs.writeFileSync(path.join(repoPath, 'test.txt'), 'test content')

      await manager.cleanupWorkspace(testRunId)

      expect(fs.existsSync(workspacePath)).toBe(false)
    })
  })

  describe('listWorkspaces', () => {
    it('should return empty array when no workspaces exist', async () => {
      const workspaces = await manager.listWorkspaces()
      expect(workspaces).toEqual([])
    })

    it('should list existing workspaces with metadata', async () => {
      // Create test workspace with metadata
      const workspacePath = manager.getWorkspacePath(testRunId)
      fs.mkdirSync(workspacePath, { recursive: true })

      const metadata = {
        runId: testRunId,
        repoUrl: 'https://example.com/repo.git',
        branch: 'main',
        createdAt: new Date().toISOString(),
      }

      fs.writeFileSync(path.join(workspacePath, '.metadata.json'), JSON.stringify(metadata))

      const workspaces = await manager.listWorkspaces()

      expect(workspaces).toHaveLength(1)
      expect(workspaces[0].runId).toBe(testRunId)
      expect(workspaces[0].repoUrl).toBe(metadata.repoUrl)
      expect(workspaces[0].branch).toBe(metadata.branch)
      expect(workspaces[0].path).toBe(workspacePath)
      expect(workspaces[0].createdAt).toBeInstanceOf(Date)
    })

    it('should skip directories without metadata', async () => {
      // Create workspace without metadata
      const workspacePath = manager.getWorkspacePath(testRunId)
      fs.mkdirSync(workspacePath, { recursive: true })

      const workspaces = await manager.listWorkspaces()

      expect(workspaces).toEqual([])
    })

    it('should skip non-directory entries', async () => {
      // Create a file in base path
      fs.writeFileSync(path.join(testBasePath, 'test-file.txt'), 'test')

      const workspaces = await manager.listWorkspaces()

      expect(workspaces).toEqual([])
    })

    it('should handle multiple workspaces', async () => {
      // Create multiple workspaces
      const runIds = ['run-1', 'run-2', 'run-3']

      for (const runId of runIds) {
        const workspacePath = manager.getWorkspacePath(runId)
        fs.mkdirSync(workspacePath, { recursive: true })

        fs.writeFileSync(
          path.join(workspacePath, '.metadata.json'),
          JSON.stringify({
            runId,
            repoUrl: `https://example.com/${runId}.git`,
            branch: 'main',
            createdAt: new Date().toISOString(),
          })
        )
      }

      const workspaces = await manager.listWorkspaces()

      expect(workspaces).toHaveLength(3)
      expect(workspaces.map((w) => w.runId).sort()).toEqual(runIds.sort())
    })
  })

  describe('Enhanced Cleanup - cleanupWorkspace with options', () => {
    it('should cleanup clone workspace with default options', async () => {
      // Create workspace with clone metadata
      const workspacePath = manager.getWorkspacePath(testRunId)
      fs.mkdirSync(workspacePath, { recursive: true })
      fs.mkdirSync(path.join(workspacePath, 'artifacts'), { recursive: true })

      const metadata = {
        runId: testRunId,
        repoUrl: 'https://example.com/repo.git',
        branch: 'main',
        isWorktree: false,
        createdAt: new Date().toISOString(),
        workspacePath,
      }

      fs.writeFileSync(path.join(workspacePath, '.metadata.json'), JSON.stringify(metadata))

      await manager.cleanupWorkspace(testRunId)

      expect(fs.existsSync(workspacePath)).toBe(false)
    })

    it('should cleanup clone workspace with keepArtifacts option', async () => {
      // Create workspace with clone metadata
      const workspacePath = manager.getWorkspacePath(testRunId)
      const artifactsPath = path.join(workspacePath, 'artifacts')
      fs.mkdirSync(artifactsPath, { recursive: true })
      fs.writeFileSync(path.join(artifactsPath, 'output.txt'), 'test')

      const metadata = {
        runId: testRunId,
        repoUrl: 'https://example.com/repo.git',
        branch: 'main',
        isWorktree: false,
        createdAt: new Date().toISOString(),
        workspacePath,
      }

      fs.writeFileSync(path.join(workspacePath, '.metadata.json'), JSON.stringify(metadata))

      await manager.cleanupWorkspace(testRunId, { keepArtifacts: true })

      // Workspace should still exist when keeping artifacts
      expect(fs.existsSync(workspacePath)).toBe(true)
      // Artifacts should still exist
      expect(fs.existsSync(artifactsPath)).toBe(true)
      expect(fs.existsSync(path.join(artifactsPath, 'output.txt'))).toBe(true)
      // Metadata should be removed
      expect(fs.existsSync(path.join(workspacePath, '.metadata.json'))).toBe(false)
    })

    it('should handle cleanup when metadata is missing', async () => {
      // Create workspace without metadata
      const workspacePath = manager.getWorkspacePath(testRunId)
      fs.mkdirSync(workspacePath, { recursive: true })

      await manager.cleanupWorkspace(testRunId)

      expect(fs.existsSync(workspacePath)).toBe(false)
    })

    it('should handle cleanup when workspace does not exist', async () => {
      // Should not throw when workspace doesn't exist
      await expect(manager.cleanupWorkspace('non-existent-run')).resolves.not.toThrow()
    })
  })

  describe('Enhanced Cleanup - pruneWorktrees', () => {
    it('should handle prune when no main repo manager', async () => {
      // Manager without main repo manager
      const simpleManager = new WorkspaceManager(testBasePath)

      // Should not throw
      await expect(simpleManager.pruneWorktrees('org-123', 'project-456')).resolves.not.toThrow()
    })
  })

  describe('Enhanced Cleanup - cleanupStaleWorktrees', () => {
    it('should handle cleanup when no main repo manager', async () => {
      // Manager without main repo manager
      const simpleManager = new WorkspaceManager(testBasePath)

      const result = await simpleManager.cleanupStaleWorktrees('org-123', 'project-456', 24 * 60 * 60 * 1000)

      // Should return empty result when no worktrees available
      expect(result.cleaned).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.diskRecovered).toBe(0)
      expect(result.errors).toEqual([])
    })
  })
})
