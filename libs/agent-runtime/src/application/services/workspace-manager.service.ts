import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'

import {
  WorkspaceCleanupError,
  WorkspaceCreationError,
  type CleanupOptions,
  type CleanupResult,
  type IMainRepoManager,
  type IWorkspaceManager,
  type WorkspaceInfo,
  type WorkspaceMetadata,
  type WorktreeInfo,
  type WorktreeOptions,
} from '../../domain'

/**
 * Workspace manager service
 *
 * NO @Injectable decorator - plain TypeScript class
 */
export class WorkspaceManager implements IWorkspaceManager {
  private readonly baseWorkspacePath: string
  private readonly mainRepoManager?: IMainRepoManager

  constructor(baseWorkspacePath?: string, mainRepoManager?: IMainRepoManager) {
    this.baseWorkspacePath = baseWorkspacePath || '/tmp/vyrak-workspaces'
    this.mainRepoManager = mainRepoManager
    this.ensureBaseDirectory()
  }

  /**
   * Create isolated workspace for a workflow run
   */
  async createWorkspace(runId: string, repoUrl: string, branch: string = 'main'): Promise<string> {
    const workspacePath = this.getWorkspacePath(runId)

    try {
      // Create workspace directory
      if (fs.existsSync(workspacePath)) {
        throw new WorkspaceCreationError(`Workspace already exists for run ${runId}`)
      }

      fs.mkdirSync(workspacePath, { recursive: true })

      // Create subdirectories
      const repoPath = path.join(workspacePath, 'repo')
      const artifactsPath = path.join(workspacePath, 'artifacts')

      fs.mkdirSync(repoPath, { recursive: true })
      fs.mkdirSync(artifactsPath, { recursive: true })

      // Clone repository
      this.cloneRepository(repoUrl, repoPath, branch)

      // Write workspace metadata
      this.writeMetadata(workspacePath, {
        runId,
        repoUrl,
        branch,
        isWorktree: false,
        createdAt: new Date().toISOString(),
      })

      return workspacePath
    } catch (error) {
      // Cleanup on failure
      if (fs.existsSync(workspacePath)) {
        fs.rmSync(workspacePath, { recursive: true, force: true })
      }

      throw new WorkspaceCreationError(
        `Failed to create workspace for run ${runId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'WORKSPACE_CREATION_FAILED',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Create workspace with git worktree (fast, disk-efficient)
   */
  async createWorkspaceWithWorktree(
    runId: string,
    repoUrl: string,
    baseBranch: string = 'main',
    options: WorktreeOptions = {}
  ): Promise<WorkspaceInfo> {
    if (!this.mainRepoManager) {
      throw new WorkspaceCreationError(
        'MainRepoManager is required for worktree creation',
        'MAIN_REPO_MANAGER_REQUIRED'
      )
    }

    // Extract org and project from repoUrl
    const { orgId, projectId } = this.parseRepoUrl(repoUrl)

    // 1. Ensure main repo exists and is updated
    const mainRepoPath = await this.mainRepoManager.ensureMainRepo(orgId, projectId, repoUrl, {
      fetchBeforeUse: options.autoFetch !== false,
    })

    // 2. Prepare paths
    const workspacePath = path.join(this.baseWorkspacePath, runId)
    const repoPath = path.join(workspacePath, 'repo')
    const artifactsPath = path.join(workspacePath, 'artifacts')

    // 3. Create workspace directory
    if (fs.existsSync(workspacePath)) {
      if (options.force) {
        fs.rmSync(workspacePath, { recursive: true, force: true })
      } else {
        throw new WorkspaceCreationError(`Workspace already exists for run ${runId}`, 'WORKSPACE_EXISTS')
      }
    }

    fs.mkdirSync(artifactsPath, { recursive: true })

    // 4. Determine branch name
    const branchPrefix = options.branchPrefix || 'workflow/'
    const branchName = options.newBranch || `${branchPrefix}${runId}`

    // 5. Check if worktree already exists
    const worktreeExists = await this.worktreeExists(mainRepoPath, repoPath)

    if (worktreeExists) {
      if (options.force) {
        await this.removeWorktree(mainRepoPath, repoPath, branchName)
      } else {
        throw new WorkspaceCreationError(`Worktree already exists for run ${runId}`, 'WORKTREE_EXISTS')
      }
    }

    // 6. Create worktree
    try {
      await this.createGitWorktree(mainRepoPath, repoPath, branchName, baseBranch)
    } catch (error) {
      // Cleanup on failure
      if (fs.existsSync(workspacePath)) {
        fs.rmSync(workspacePath, { recursive: true, force: true })
      }

      throw new WorkspaceCreationError(
        `Failed to create worktree: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'WORKTREE_CREATION_FAILED',
        error instanceof Error ? error : undefined
      )
    }

    // 7. Save metadata
    const createdAt = new Date()
    const metadata: WorkspaceMetadata = {
      runId,
      repoUrl,
      branch: baseBranch,
      isWorktree: true,
      branchName,
      mainRepoPath,
      workspacePath,
      createdAt: createdAt.toISOString(),
    }
    this.writeMetadata(workspacePath, metadata)

    return {
      runId,
      path: workspacePath,
      repoUrl,
      branch: baseBranch,
      createdAt,
      isWorktree: true,
      branchName,
      mainRepoPath,
    }
  }

  /**
   * Cleanup workspace after execution
   */
  async cleanupWorkspace(runId: string, options: CleanupOptions = {}): Promise<void> {
    // Try to load metadata
    const metadata = await this.loadMetadata(runId)

    if (!metadata) {
      console.warn('Workspace metadata not found', { runId })
      // Try best-effort cleanup
      await this.cleanupWorkspaceDirectory(runId)
      return
    }

    if (metadata.isWorktree) {
      await this.cleanupWorktreeWorkspace(runId, metadata, options)
    } else {
      await this.cleanupCloneWorkspace(runId, metadata, options)
    }
  }

  /**
   * Cleanup stale worktree workspaces
   */
  async cleanupStaleWorktrees(
    orgId: string,
    projectId: string,
    maxAgeMs: number = 24 * 60 * 60 * 1000 // 24 hours default
  ): Promise<CleanupResult> {
    const result: CleanupResult = {
      cleaned: 0,
      failed: 0,
      diskRecovered: 0,
      errors: [],
    }

    try {
      // Get all worktrees for this project
      const worktrees = await this.listWorktrees(orgId, projectId)

      for (const worktree of worktrees) {
        // Calculate age
        const age = Date.now() - worktree.createdAt.getTime()

        // Skip if not stale
        if (age < maxAgeMs) {
          continue
        }

        // Skip if locked (active)
        if (worktree.isLocked) {
          continue
        }

        // Try to cleanup
        try {
          // Calculate disk usage before cleanup
          const diskBefore = await this.getWorkspaceDiskUsage(worktree.runId)

          await this.cleanupWorkspace(worktree.runId, {
            deleteBranch: true,
            force: false,
          })

          result.cleaned++
          result.diskRecovered += diskBefore
        } catch (error) {
          result.failed++
          result.errors.push({
            runId: worktree.runId,
            path: worktree.path,
            reason: error instanceof Error ? error.message : 'Unknown error',
          })

          console.error('Stale worktree cleanup failed', {
            runId: worktree.runId,
            error: error instanceof Error ? error.message : 'Unknown',
          })
        }
      }

      console.log('Stale worktrees cleanup complete', {
        cleaned: result.cleaned,
        failed: result.failed,
        diskRecovered: `${(result.diskRecovered / 1024 / 1024).toFixed(2)} MB`,
      })

      return result
    } catch (error) {
      throw new WorkspaceCleanupError(
        `Failed to cleanup stale worktrees: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { orgId, projectId, cause: error }
      )
    }
  }

  /**
   * Prune deleted worktrees from main repository
   */
  async pruneWorktrees(orgId: string, projectId: string): Promise<void> {
    if (!this.mainRepoManager) {
      return // No main repo manager, nothing to prune
    }

    const mainRepoPath = this.mainRepoManager.getMainRepoPath(orgId, projectId)

    if (!(await this.mainRepoManager.mainRepoExists(orgId, projectId))) {
      return // No main repo, nothing to prune
    }

    try {
      execSync('git worktree prune', {
        cwd: mainRepoPath,
        stdio: 'pipe',
        timeout: 10000, // 10s timeout
      })

      console.log('Worktrees pruned', { mainRepoPath })
    } catch (error) {
      console.error('Worktree prune failed', {
        mainRepoPath,
        error: error instanceof Error ? error.message : 'Unknown',
      })
    }
  }

  /**
   * List worktrees for an organization and project
   */
  async listWorktrees(orgId: string, projectId: string): Promise<WorktreeInfo[]> {
    if (!this.mainRepoManager) {
      return []
    }

    const mainRepoPath = this.mainRepoManager.getMainRepoPath(orgId, projectId)

    if (!(await this.mainRepoManager.mainRepoExists(orgId, projectId))) {
      return []
    }

    try {
      const result = execSync('git worktree list --porcelain', {
        cwd: mainRepoPath,
        stdio: 'pipe',
        encoding: 'utf-8',
      })

      return this.parseWorktreeList(result)
    } catch (error) {
      console.error('Failed to list worktrees', { mainRepoPath, error })
      return []
    }
  }

  /**
   * Get workspace path for a run
   */
  getWorkspacePath(runId: string): string {
    return path.join(this.baseWorkspacePath, runId)
  }

  /**
   * List all active workspaces
   */
  async listWorkspaces(): Promise<WorkspaceInfo[]> {
    if (!fs.existsSync(this.baseWorkspacePath)) {
      return []
    }

    const workspaces: WorkspaceInfo[] = []
    const entries = fs.readdirSync(this.baseWorkspacePath, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const workspacePath = path.join(this.baseWorkspacePath, entry.name)
      const metadataPath = path.join(workspacePath, '.metadata.json')

      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))

          const stats = fs.statSync(workspacePath)

          workspaces.push({
            runId: entry.name,
            path: workspacePath,
            repoUrl: metadata.repoUrl,
            branch: metadata.branch,
            createdAt: stats.birthtime,
          })
        } catch (error) {
          console.error(`Failed to read metadata for ${entry.name}:`, error)
        }
      }
    }

    return workspaces
  }

  /**
   * Get repository path within workspace
   */
  getRepoPath(runId: string): string {
    return path.join(this.getWorkspacePath(runId), 'repo')
  }

  /**
   * Get artifacts path within workspace
   */
  getArtifactsPath(runId: string): string {
    return path.join(this.getWorkspacePath(runId), 'artifacts')
  }

  /**
   * Ensure base workspace directory exists
   */
  private ensureBaseDirectory(): void {
    if (!fs.existsSync(this.baseWorkspacePath)) {
      fs.mkdirSync(this.baseWorkspacePath, { recursive: true })
    }
  }

  /**
   * Clone git repository
   */
  private cloneRepository(repoUrl: string, targetPath: string, branch: string): void {
    try {
      // Clone with depth 1 for faster cloning
      const command = `git clone --depth 1 --branch ${branch} ${repoUrl} ${targetPath}`

      execSync(command, {
        stdio: 'pipe',
        timeout: 5 * 60 * 1000, // 5 minutes timeout
      })
    } catch (error) {
      throw new WorkspaceCreationError(
        `Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GIT_CLONE_FAILED',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Create git worktree
   */
  private async createGitWorktree(
    mainRepoPath: string,
    worktreePath: string,
    branchName: string,
    baseBranch: string
  ): Promise<void> {
    try {
      const command = `git worktree add ${worktreePath} -b ${branchName} origin/${baseBranch}`

      execSync(command, {
        cwd: mainRepoPath,
        stdio: 'pipe',
        timeout: 30000, // 30s timeout
      })
    } catch (error) {
      throw new Error(`Git worktree add failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if worktree exists
   */
  private async worktreeExists(mainRepoPath: string, worktreePath: string): Promise<boolean> {
    try {
      const result = execSync('git worktree list --porcelain', {
        cwd: mainRepoPath,
        stdio: 'pipe',
        encoding: 'utf-8',
      })

      // Parse porcelain output
      const lines = result.split('\n')
      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          const path = line.substring('worktree '.length)
          if (path === worktreePath) {
            return true
          }
        }
      }

      return false
    } catch {
      return false
    }
  }

  /**
   * Remove worktree
   */
  private async removeWorktree(mainRepoPath: string, worktreePath: string, branchName: string): Promise<void> {
    // Remove worktree
    try {
      execSync(`git worktree remove ${worktreePath} --force`, {
        cwd: mainRepoPath,
        stdio: 'pipe',
      })
    } catch (error) {
      console.warn('Failed to remove worktree', { worktreePath, error })
    }

    // Delete branch (optional)
    try {
      execSync(`git branch -D ${branchName}`, {
        cwd: mainRepoPath,
        stdio: 'pipe',
      })
    } catch (_error) {
      // Branch may not exist, ignore
    }
  }

  /**
   * Parse git worktree list output
   */
  private parseWorktreeList(output: string): WorktreeInfo[] {
    const worktrees: WorktreeInfo[] = []
    const lines = output.split('\n')

    let current: Partial<WorktreeInfo> = {}

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        current.path = line.substring('worktree '.length)
      } else if (line.startsWith('branch ')) {
        const branch = line.substring('branch '.length).replace('refs/heads/', '')
        current.branch = branch

        // Extract runId from branch name
        const match = branch.match(/^workflow\/(.+)$/)
        if (match) {
          current.runId = match[1]
        }
      } else if (line.startsWith('locked')) {
        current.isLocked = true
      } else if (line.startsWith('prunable')) {
        current.isPrunable = true
      } else if (line === '') {
        // End of current worktree entry
        if (current.path && current.branch) {
          worktrees.push({
            runId: current.runId || 'unknown',
            path: current.path,
            branch: current.branch,
            isLocked: current.isLocked || false,
            isPrunable: current.isPrunable || false,
            createdAt: new Date(), // Approximate
          })
        }
        current = {}
      }
    }

    return worktrees
  }

  /**
   * Parse repository URL to extract org and project IDs
   */
  private parseRepoUrl(repoUrl: string): {
    orgId: string
    projectId: string
  } {
    // Parse GitHub URL: https://github.com/{org}/{repo}.git
    // Or: git@github.com:{org}/{repo}.git

    const match = repoUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/)

    if (match) {
      return {
        orgId: match[1],
        projectId: match[2].replace('.git', ''),
      }
    }

    // Fallback: use hash of URL
    const hash = createHash('md5').update(repoUrl).digest('hex').substring(0, 8)
    return {
      orgId: 'default',
      projectId: hash,
    }
  }

  /**
   * Write workspace metadata
   */
  private writeMetadata(workspacePath: string, metadata: Omit<WorkspaceMetadata, 'workspacePath'>): void {
    const metadataPath = path.join(workspacePath, '.metadata.json')

    fs.writeFileSync(
      metadataPath,
      JSON.stringify(
        {
          ...metadata,
          workspacePath,
          createdAt: typeof metadata.createdAt === 'string' ? metadata.createdAt : new Date().toISOString(),
        },
        null,
        2
      )
    )
  }

  /**
   * Load workspace metadata
   */
  private async loadMetadata(runId: string): Promise<WorkspaceMetadata | null> {
    const workspacePath = this.getWorkspacePath(runId)
    const metadataPath = path.join(workspacePath, '.metadata.json')

    if (!fs.existsSync(metadataPath)) {
      return null
    }

    try {
      const content = fs.readFileSync(metadataPath, 'utf-8')
      const metadata = JSON.parse(content) as WorkspaceMetadata
      metadata.workspacePath = workspacePath
      return metadata
    } catch (error) {
      console.error('Failed to read workspace metadata', { runId, error })
      return null
    }
  }

  /**
   * Remove workspace metadata
   */
  private async removeMetadata(runId: string): Promise<void> {
    const metadataPath = path.join(this.getWorkspacePath(runId), '.metadata.json')

    if (fs.existsSync(metadataPath)) {
      try {
        fs.unlinkSync(metadataPath)
      } catch (error) {
        console.warn('Failed to remove metadata', { runId, error })
      }
    }
  }

  /**
   * Cleanup worktree workspace
   */
  private async cleanupWorktreeWorkspace(
    runId: string,
    metadata: WorkspaceMetadata,
    options: CleanupOptions
  ): Promise<void> {
    const { mainRepoPath, branchName, workspacePath } = metadata

    if (!mainRepoPath) {
      throw new WorkspaceCleanupError('Main repo path not found in metadata', {
        runId,
      })
    }

    try {
      // 1. Remove worktree
      await this.removeWorktreeCleanup(mainRepoPath, path.join(workspacePath, 'repo'), options.force || false)

      // 2. Delete branch (optional)
      if (branchName && options.deleteBranch !== false) {
        await this.deleteBranch(mainRepoPath, branchName)
      }

      // 3. Remove workspace directory
      if (!options.keepArtifacts) {
        await this.cleanupWorkspaceDirectory(runId)
      }

      // 4. Remove metadata
      await this.removeMetadata(runId)

      console.log('Worktree workspace cleaned', {
        runId,
        branchDeleted: options.deleteBranch !== false,
      })
    } catch (error) {
      throw new WorkspaceCleanupError(
        `Failed to cleanup worktree workspace: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { runId, cause: error }
      )
    }
  }

  /**
   * Cleanup clone workspace
   */
  private async cleanupCloneWorkspace(
    runId: string,
    _metadata: WorkspaceMetadata,
    options: CleanupOptions
  ): Promise<void> {
    try {
      // Remove workspace directory (includes full clone)
      if (!options.keepArtifacts) {
        await this.cleanupWorkspaceDirectory(runId)
      }

      // Remove metadata
      await this.removeMetadata(runId)

      console.log('Clone workspace cleaned', { runId })
    } catch (error) {
      throw new WorkspaceCleanupError(
        `Failed to cleanup clone workspace: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { runId, cause: error }
      )
    }
  }

  /**
   * Remove git worktree (cleanup version)
   */
  private async removeWorktreeCleanup(mainRepoPath: string, worktreePath: string, force: boolean): Promise<void> {
    const args = ['worktree', 'remove', worktreePath]

    if (force) {
      args.push('--force')
    }

    try {
      execSync(`git ${args.join(' ')}`, {
        cwd: mainRepoPath,
        stdio: 'pipe',
        timeout: 10000, // 10s timeout
      })
    } catch (error) {
      // Log warning but don't throw - worktree may already be removed
      console.warn('Worktree removal failed', {
        worktreePath,
        error: error instanceof Error ? error.message : 'Unknown',
      })
    }
  }

  /**
   * Delete git branch
   */
  private async deleteBranch(mainRepoPath: string, branchName: string): Promise<void> {
    try {
      execSync(`git branch -D ${branchName}`, {
        cwd: mainRepoPath,
        stdio: 'pipe',
        timeout: 5000, // 5s timeout
      })
    } catch (error) {
      // Log warning but don't throw - branch may not exist
      console.warn('Branch deletion failed', {
        branchName,
        error: error instanceof Error ? error.message : 'Unknown',
      })
    }
  }

  /**
   * Cleanup workspace directory
   */
  private async cleanupWorkspaceDirectory(runId: string): Promise<void> {
    const workspacePath = path.join(this.baseWorkspacePath, runId)

    try {
      fs.rmSync(workspacePath, { recursive: true, force: true })
    } catch (error) {
      throw new Error(
        `Failed to remove workspace directory: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get workspace disk usage in bytes
   */
  private async getWorkspaceDiskUsage(runId: string): Promise<number> {
    const workspacePath = path.join(this.baseWorkspacePath, runId)

    try {
      const result = execSync(`du -sb "${workspacePath}"`, {
        stdio: 'pipe',
        encoding: 'utf-8',
      })
      return parseInt(result.split('\t')[0], 10)
    } catch {
      return 0
    }
  }
}
