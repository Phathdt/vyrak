import type { IWorkflowRepositoryRepository } from '../../domain/interfaces'
import type { IRepoCacheService, RepositoryReference } from '../../domain/interfaces/repo-cache.interface'
import type { IGitRepositoryRepository } from '@vyrak/project'

/**
 * Generic service to resolve repository paths for workflow phases.
 * Used by brainstorming, planning, and other phases that need repository context.
 * The repository is cloned (or fetched) on this host on demand.
 */
export class RepositoryContextService {
  constructor(
    private readonly workflowRepositoryRepository: IWorkflowRepositoryRepository,
    private readonly gitRepositoryRepository: IGitRepositoryRepository,
    private readonly repoCache: IRepoCacheService
  ) {}

  /**
   * Find the first repository linked to a workflow.
   *
   * @param workflowId - Workflow ID
   * @returns Repository reference or null when the workflow has no linked repository
   */
  async resolveRepository(workflowId: string): Promise<RepositoryReference | null> {
    const workflowRepos = await this.workflowRepositoryRepository.findByWorkflowId(workflowId)
    if (workflowRepos.length === 0) {
      return null
    }

    const gitRepo = await this.gitRepositoryRepository.findById(workflowRepos[0].repositoryId)
    if (!gitRepo) {
      return null
    }

    return {
      organizationId: gitRepo.organizationId,
      projectId: gitRepo.projectId,
      name: gitRepo.name,
      url: gitRepo.url,
      branch: gitRepo.branch,
    }
  }

  /**
   * Resolve local repository path for a workflow, cloning or fetching it first.
   * Returns null when there is no repository context (no linked repository, or clone/fetch failed).
   *
   * @param workflowId - Workflow ID
   * @returns Local repository path or null
   */
  async resolveRepositoryPath(workflowId: string): Promise<string | null> {
    try {
      const repository = await this.resolveRepository(workflowId)
      if (!repository) {
        return null
      }
      return await this.ensureLocalClone(repository)
    } catch (error) {
      // Callers continue without repository context; keep the cause visible.
      console.warn(`[RepositoryContext] Repository unavailable for workflow ${workflowId}: ${describe(error)}`)
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
      const paths: string[] = []

      for (const workflowRepo of workflowRepos) {
        const gitRepo = await this.gitRepositoryRepository.findById(workflowRepo.repositoryId)
        if (!gitRepo) continue

        try {
          paths.push(
            await this.ensureLocalClone({
              organizationId: gitRepo.organizationId,
              projectId: gitRepo.projectId,
              name: gitRepo.name,
              url: gitRepo.url,
              branch: gitRepo.branch,
            })
          )
        } catch (error) {
          console.warn(`[RepositoryContext] Skipping repository ${gitRepo.name}: ${describe(error)}`)
        }
      }

      return paths
    } catch (error) {
      console.warn(`[RepositoryContext] Repositories unavailable for workflow ${workflowId}: ${describe(error)}`)
      return []
    }
  }

  private ensureLocalClone(repository: RepositoryReference): Promise<string> {
    return this.repoCache.ensureRepo({
      organizationId: repository.organizationId,
      projectId: repository.projectId,
      repoName: repository.name,
      url: repository.url,
      branch: repository.branch,
    })
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
