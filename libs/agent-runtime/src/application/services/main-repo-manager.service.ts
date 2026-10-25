import { execSync } from 'node:child_process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { MainRepoError, type IMainRepoManager, type MainRepoOptions, type RepoHealthStatus } from '../../domain'

/**
 * Main repository manager service
 *
 * NO @Injectable decorator - plain TypeScript class
 *
 * Manages shared main repositories that serve as the base for git worktrees.
 * Each organization/project pair has one main repository at:
 * /var/vyrak/repos/{orgId}/{projectId}/main-repo/
 */
export class MainRepoManager implements IMainRepoManager {
  private readonly baseReposPath: string

  constructor(baseReposPath?: string) {
    this.baseReposPath = baseReposPath || '/var/vyrak/repos'
  }

  /**
   * Ensure main repository exists and is up to date
   */
  async ensureMainRepo(
    orgId: string,
    projectId: string,
    repoUrl: string,
    options: MainRepoOptions = {}
  ): Promise<string> {
    const repoPath = this.getMainRepoPath(orgId, projectId)

    // Check if exists
    const exists = await this.mainRepoExists(orgId, projectId)

    if (exists && !options.force) {
      // Update existing repo
      if (options.fetchBeforeUse !== false) {
        await this.updateMainRepo(orgId, projectId)
      }
      return repoPath
    }

    // Clone new repo
    if (exists && options.force) {
      await this.deleteMainRepo(orgId, projectId)
    }

    await this.cloneMainRepo(repoUrl, repoPath, options)

    return repoPath
  }

  /**
   * Update main repository (git fetch)
   */
  async updateMainRepo(orgId: string, projectId: string): Promise<void> {
    const repoPath = this.getMainRepoPath(orgId, projectId)

    if (!(await this.mainRepoExists(orgId, projectId))) {
      throw new MainRepoError('Main repo does not exist', { repoPath })
    }

    try {
      // Fetch all branches and tags
      execSync('git fetch --all --prune', {
        cwd: repoPath,
        stdio: 'pipe',
        timeout: 2 * 60 * 1000, // 2 min timeout
      })

      console.log('Main repo updated', { repoPath })
    } catch (error) {
      throw new MainRepoError(
        `Failed to update main repo: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { repoPath, cause: error }
      )
    }
  }

  /**
   * Check if main repository exists
   */
  async mainRepoExists(orgId: string, projectId: string): Promise<boolean> {
    const repoPath = this.getMainRepoPath(orgId, projectId)

    try {
      const stats = await fs.stat(path.join(repoPath, '.git'))
      return stats.isDirectory()
    } catch {
      return false
    }
  }

  /**
   * Get main repository path
   */
  getMainRepoPath(orgId: string, projectId: string): string {
    return path.join(this.baseReposPath, orgId, projectId, 'main-repo')
  }

  /**
   * Health check for main repository
   */
  async checkRepoHealth(orgId: string, projectId: string): Promise<RepoHealthStatus> {
    const repoPath = this.getMainRepoPath(orgId, projectId)
    const issues: string[] = []

    // Check exists
    const exists = await fs
      .access(repoPath)
      .then(() => true)
      .catch(() => false)

    if (!exists) {
      return {
        healthy: false,
        path: repoPath,
        exists: false,
        isGitRepo: false,
        hasRemote: false,
        diskUsage: 0,
        issues: ['Repo does not exist'],
      }
    }

    // Check is git repo
    const isGitRepo = await fs
      .access(path.join(repoPath, '.git'))
      .then(() => true)
      .catch(() => false)

    if (!isGitRepo) {
      issues.push('Not a git repository')
    }

    // Check remote
    let hasRemote = false
    try {
      const result = execSync('git remote -v', {
        cwd: repoPath,
        stdio: 'pipe',
        encoding: 'utf-8',
      })
      hasRemote = result.trim().length > 0
    } catch {
      issues.push('Failed to check remote')
    }

    // Check disk usage
    let diskUsage = 0
    try {
      const result = execSync(`du -sb "${repoPath}"`, {
        stdio: 'pipe',
        encoding: 'utf-8',
      })
      diskUsage = parseInt(result.split('\t')[0], 10)
    } catch {
      issues.push('Failed to check disk usage')
    }

    // Check last fetch time (from FETCH_HEAD)
    let lastFetched: Date | undefined
    try {
      const fetchHeadPath = path.join(repoPath, '.git', 'FETCH_HEAD')
      const stats = await fs.stat(fetchHeadPath)
      lastFetched = stats.mtime
    } catch {
      // FETCH_HEAD may not exist if never fetched
    }

    return {
      healthy: issues.length === 0,
      path: repoPath,
      exists,
      isGitRepo,
      hasRemote,
      diskUsage,
      lastFetched,
      issues,
    }
  }

  /**
   * Delete main repository (admin only)
   */
  async deleteMainRepo(orgId: string, projectId: string): Promise<void> {
    const repoPath = this.getMainRepoPath(orgId, projectId)

    if (!(await this.mainRepoExists(orgId, projectId))) {
      return // Already deleted
    }

    try {
      await fs.rm(repoPath, { recursive: true, force: true })
      console.log('Main repo deleted', { repoPath })
    } catch (error) {
      throw new MainRepoError(
        `Failed to delete main repo: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { repoPath, cause: error }
      )
    }
  }

  /**
   * Clone main repository
   */
  private async cloneMainRepo(repoUrl: string, repoPath: string, options: MainRepoOptions): Promise<void> {
    // Create parent directory
    await fs.mkdir(path.dirname(repoPath), { recursive: true })

    // Build git clone command
    const args = ['clone', repoUrl, repoPath]

    if (options.depth) {
      args.push('--depth', options.depth.toString())
    }

    const command = `git ${args.join(' ')}`

    try {
      execSync(command, {
        stdio: 'pipe',
        timeout: 5 * 60 * 1000, // 5 min timeout
      })

      console.log('Main repo cloned', { repoPath, repoUrl })
    } catch (error) {
      throw new MainRepoError(
        `Failed to clone main repo: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { repoUrl, repoPath, cause: error }
      )
    }
  }
}
