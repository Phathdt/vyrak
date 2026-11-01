import { access } from 'node:fs/promises'

import type { IWorkflowRepositoryRepository } from '../../domain/interfaces'
import type { CustomConfigService } from '@vyrak/custom-config'
import type { IGitRepositoryRepository } from '@vyrak/project'

/**
 * Generic service to resolve repository paths for workflow phases.
 * Used by brainstorming, planning, and other phases that need repository context.
 */
export class RepositoryContextService {
  constructor(
    private readonly workflowRepositoryRepository: IWorkflowRepositoryRepository,
    private readonly gitRepositoryRepository: IGitRepositoryRepository,
    private readonly configService: CustomConfigService
  ) {}

  /**
   * Resolve local repository path for a workflow.
   * Returns the first accessible repository path, or null if none found.
   *
   * @param workflowId - Workflow ID
   * @returns Local repository path or null
   */
  async resolveRepositoryPath(workflowId: string): Promise<string | null> {
    try {
      // 1. Get workflow repositories
      const workflowRepos = await this.workflowRepositoryRepository.findByWorkflowId(workflowId)
      if (workflowRepos.length === 0) {
        return null
      }

      // 2. Get first GitRepository detail
      const firstRepoId = workflowRepos[0].repositoryId
      const gitRepo = await this.gitRepositoryRepository.findById(firstRepoId)
      if (!gitRepo) {
        return null
      }

      // 3. Build local path from MAIN_REPOS_PATH + repo name
      const mainReposPath = this.configService.workspace?.mainReposPath
      if (!mainReposPath) {
        return null
      }

      // Path candidates (first match wins)
      const candidates = [
        `${mainReposPath}/${gitRepo.name}`,
        `${mainReposPath}/${gitRepo.organizationId}/${gitRepo.projectId}/${gitRepo.name}`,
      ]

      // Return first existing directory
      for (const path of candidates) {
        try {
          await access(path)
          return path
        } catch {
          // Continue to next candidate
        }
      }

      return null
    } catch {
      // If any error occurs, fallback to no repo context
      return null
    }
  }

  /**
   * Resolve all repository paths for a workflow.
   * Useful when a workflow is linked to multiple repositories.
   *
   * @param workflowId - Workflow ID
   * @returns Array of local repository paths
   */
  async resolveAllRepositoryPaths(workflowId: string): Promise<string[]> {
    try {
      const workflowRepos = await this.workflowRepositoryRepository.findByWorkflowId(workflowId)
      if (workflowRepos.length === 0) {
        return []
      }

      const mainReposPath = this.configService.workspace?.mainReposPath
      if (!mainReposPath) {
        return []
      }

      const paths: string[] = []

      for (const workflowRepo of workflowRepos) {
        const gitRepo = await this.gitRepositoryRepository.findById(workflowRepo.repositoryId)
        if (!gitRepo) continue

        const candidates = [
          `${mainReposPath}/${gitRepo.name}`,
          `${mainReposPath}/${gitRepo.organizationId}/${gitRepo.projectId}/${gitRepo.name}`,
        ]

        for (const path of candidates) {
          try {
            await access(path)
            paths.push(path)
            break
          } catch {
            // Continue to next candidate
          }
        }
      }

      return paths
    } catch {
      return []
    }
  }
}
