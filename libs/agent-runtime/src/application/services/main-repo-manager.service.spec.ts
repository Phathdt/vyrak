import { execSync } from 'node:child_process'
import * as fs from 'node:fs/promises'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MainRepoManager } from './main-repo-manager.service'

import { MainRepoError } from '../../domain/errors/main-repo.errors'

// Mock node modules
vi.mock('node:child_process')
vi.mock('node:fs/promises')

describe('MainRepoManager', () => {
  let manager: MainRepoManager
  const testBasePath = '/tmp/test-vyrak-repos'

  beforeEach(() => {
    manager = new MainRepoManager(testBasePath)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getMainRepoPath', () => {
    it('should return correct path format', () => {
      const result = manager.getMainRepoPath('org-123', 'project-456')
      expect(result).toBe('/tmp/test-vyrak-repos/org-123/project-456/main-repo')
    })

    it('should handle special characters in IDs', () => {
      const result = manager.getMainRepoPath('org-abc-123', 'project_xyz_789')
      expect(result).toBe('/tmp/test-vyrak-repos/org-abc-123/project_xyz_789/main-repo')
    })
  })

  describe('mainRepoExists', () => {
    it('should return true when .git directory exists', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
      } as any)

      const result = await manager.mainRepoExists('org-123', 'project-456')

      expect(result).toBe(true)
      expect(fs.stat).toHaveBeenCalledWith('/tmp/test-vyrak-repos/org-123/project-456/main-repo/.git')
    })

    it('should return false when .git does not exist', async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'))

      const result = await manager.mainRepoExists('org-123', 'project-456')

      expect(result).toBe(false)
    })

    it('should return false when .git is not a directory', async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => false,
      } as any)

      const result = await manager.mainRepoExists('org-123', 'project-456')

      expect(result).toBe(false)
    })
  })

  describe('ensureMainRepo', () => {
    it('should clone new repo when not exists', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Mock repo doesn't exist
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(execSync).mockReturnValue(Buffer.from(''))

      const result = await manager.ensureMainRepo('org-123', 'project-456', 'https://github.com/test/repo.git')

      expect(result).toBe('/tmp/test-vyrak-repos/org-123/project-456/main-repo')
      expect(fs.mkdir).toHaveBeenCalled()
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('git clone https://github.com/test/repo.git'),
        expect.objectContaining({
          timeout: 5 * 60 * 1000,
        })
      )
      expect(consoleLogSpy).toHaveBeenCalledWith('Main repo cloned', expect.any(Object))

      consoleLogSpy.mockRestore()
    })

    it('should update existing repo when exists', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Mock repo exists
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
      } as any)
      vi.mocked(execSync).mockReturnValue(Buffer.from(''))

      const result = await manager.ensureMainRepo('org-123', 'project-456', 'https://github.com/test/repo.git')

      expect(result).toBe('/tmp/test-vyrak-repos/org-123/project-456/main-repo')
      expect(execSync).toHaveBeenCalledWith(
        'git fetch --all --prune',
        expect.objectContaining({
          cwd: '/tmp/test-vyrak-repos/org-123/project-456/main-repo',
        })
      )
      expect(consoleLogSpy).toHaveBeenCalledWith('Main repo updated', expect.any(Object))

      consoleLogSpy.mockRestore()
    })

    it('should skip fetch when fetchBeforeUse is false', async () => {
      // Mock repo exists
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
      } as any)

      const result = await manager.ensureMainRepo('org-123', 'project-456', 'https://github.com/test/repo.git', {
        fetchBeforeUse: false,
      })

      expect(result).toBe('/tmp/test-vyrak-repos/org-123/project-456/main-repo')
      expect(execSync).not.toHaveBeenCalled()
    })

    it('should force re-clone when force=true', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Mock repo exists
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
      } as any)
      vi.mocked(fs.rm).mockResolvedValue(undefined)
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(execSync).mockReturnValue(Buffer.from(''))

      const result = await manager.ensureMainRepo('org-123', 'project-456', 'https://github.com/test/repo.git', {
        force: true,
      })

      expect(result).toBe('/tmp/test-vyrak-repos/org-123/project-456/main-repo')
      expect(fs.rm).toHaveBeenCalledWith('/tmp/test-vyrak-repos/org-123/project-456/main-repo', {
        recursive: true,
        force: true,
      })
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('git clone'), expect.any(Object))

      consoleLogSpy.mockRestore()
    })

    it('should use shallow clone when depth is specified', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Mock repo doesn't exist
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(execSync).mockReturnValue(Buffer.from(''))

      await manager.ensureMainRepo('org-123', 'project-456', 'https://github.com/test/repo.git', { depth: 1 })

      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('--depth 1'), expect.any(Object))

      consoleLogSpy.mockRestore()
    })

    it('should throw MainRepoError when clone fails', async () => {
      // Mock repo doesn't exist
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Network timeout')
      })

      await expect(
        manager.ensureMainRepo('org-123', 'project-456', 'https://github.com/test/repo.git')
      ).rejects.toThrow(MainRepoError)

      await expect(
        manager.ensureMainRepo('org-123', 'project-456', 'https://github.com/test/repo.git')
      ).rejects.toThrow('Failed to clone main repo')
    })
  })

  describe('updateMainRepo', () => {
    it('should fetch all branches and tags', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Mock repo exists
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
      } as any)
      vi.mocked(execSync).mockReturnValue(Buffer.from(''))

      await manager.updateMainRepo('org-123', 'project-456')

      expect(execSync).toHaveBeenCalledWith(
        'git fetch --all --prune',
        expect.objectContaining({
          cwd: '/tmp/test-vyrak-repos/org-123/project-456/main-repo',
          timeout: 2 * 60 * 1000,
        })
      )
      expect(consoleLogSpy).toHaveBeenCalledWith('Main repo updated', expect.any(Object))

      consoleLogSpy.mockRestore()
    })

    it('should throw when repo does not exist', async () => {
      // Mock repo doesn't exist
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'))

      await expect(manager.updateMainRepo('org-123', 'project-456')).rejects.toThrow(MainRepoError)

      await expect(manager.updateMainRepo('org-123', 'project-456')).rejects.toThrow('Main repo does not exist')
    })

    it('should throw MainRepoError when fetch fails', async () => {
      // Mock repo exists
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
      } as any)
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Network error')
      })

      await expect(manager.updateMainRepo('org-123', 'project-456')).rejects.toThrow(MainRepoError)

      await expect(manager.updateMainRepo('org-123', 'project-456')).rejects.toThrow('Failed to update main repo')
    })
  })

  describe('checkRepoHealth', () => {
    it('should return healthy status for valid repo', async () => {
      // Mock repo exists with .git
      vi.mocked(fs.access).mockResolvedValue(undefined)

      // Mock execSync calls in order: git remote -v, then du -sb
      vi.mocked(execSync)
        .mockReturnValueOnce('origin  https://github.com/test/repo.git (fetch)\n' as any)
        .mockReturnValueOnce('1024000\t/path/to/repo\n' as any)

      // Mock FETCH_HEAD stats
      vi.mocked(fs.stat).mockResolvedValue({
        mtime: new Date('2024-01-15'),
      } as any)

      const result = await manager.checkRepoHealth('org-123', 'project-456')

      expect(result.healthy).toBe(true)
      expect(result.exists).toBe(true)
      expect(result.isGitRepo).toBe(true)
      expect(result.hasRemote).toBe(true)
      expect(result.diskUsage).toBeGreaterThan(0)
      expect(result.issues).toHaveLength(0)
    })

    it('should return unhealthy when repo does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))

      const result = await manager.checkRepoHealth('org-123', 'project-456')

      expect(result.healthy).toBe(false)
      expect(result.exists).toBe(false)
      expect(result.isGitRepo).toBe(false)
      expect(result.hasRemote).toBe(false)
      expect(result.diskUsage).toBe(0)
      expect(result.issues).toContain('Repo does not exist')
    })

    it('should detect when directory is not a git repo', async () => {
      // Mock repo exists but no .git
      vi.mocked(fs.access)
        .mockResolvedValueOnce(undefined) // Repo path exists
        .mockRejectedValueOnce(new Error('ENOENT')) // .git doesn't exist

      const result = await manager.checkRepoHealth('org-123', 'project-456')

      expect(result.healthy).toBe(false)
      expect(result.exists).toBe(true)
      expect(result.isGitRepo).toBe(false)
      expect(result.issues).toContain('Not a git repository')
    })

    it('should handle missing remote', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string' && cmd.includes('git remote')) {
          return '' as any // No remotes
        }
        if (typeof cmd === 'string' && cmd.includes('du -sb')) {
          return '1024\t/path\n' as any
        }
        return '' as any
      })
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'))

      const result = await manager.checkRepoHealth('org-123', 'project-456')

      expect(result.hasRemote).toBe(false)
    })

    it('should handle missing FETCH_HEAD gracefully', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(execSync).mockReturnValue('origin  https://github.com/test/repo.git (fetch)\n')
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT')) // FETCH_HEAD doesn't exist

      const result = await manager.checkRepoHealth('org-123', 'project-456')

      expect(result.lastFetched).toBeUndefined()
      expect(result.healthy).toBe(true) // Still healthy even without FETCH_HEAD
    })
  })

  describe('deleteMainRepo', () => {
    it('should delete existing repo', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Mock repo exists
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
      } as any)
      vi.mocked(fs.rm).mockResolvedValue(undefined)

      await manager.deleteMainRepo('org-123', 'project-456')

      expect(fs.rm).toHaveBeenCalledWith('/tmp/test-vyrak-repos/org-123/project-456/main-repo', {
        recursive: true,
        force: true,
      })
      expect(consoleLogSpy).toHaveBeenCalledWith('Main repo deleted', expect.any(Object))

      consoleLogSpy.mockRestore()
    })

    it('should not throw when repo does not exist', async () => {
      // Mock repo doesn't exist
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'))

      await expect(manager.deleteMainRepo('org-123', 'project-456')).resolves.not.toThrow()

      expect(fs.rm).not.toHaveBeenCalled()
    })

    it('should throw MainRepoError when deletion fails', async () => {
      // Mock repo exists
      vi.mocked(fs.stat).mockResolvedValue({
        isDirectory: () => true,
      } as any)
      vi.mocked(fs.rm).mockRejectedValue(new Error('Permission denied'))

      await expect(manager.deleteMainRepo('org-123', 'project-456')).rejects.toThrow(MainRepoError)

      await expect(manager.deleteMainRepo('org-123', 'project-456')).rejects.toThrow('Failed to delete main repo')
    })
  })
})
