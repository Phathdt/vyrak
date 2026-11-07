import type { WorkflowRepositoryResolver } from './workflow-repository-resolver.service'
import type { IRepoCacheService, RepositoryReference } from '@vyrak/repository'

/**
 * Service to resolve repository paths for workflow phases (worker-only).
 * Used by brainstorming, planning, and other phases that need repository context.
 * The repository is cloned (or fetched) on this host on demand.
 *
 * NOTE: This service requires IRepoCacheService and is only available in the worker.
 * For api-server, use WorkflowRepositoryResolver instead (metadata-only queries).
 */
export class RepositoryContextService {
  constructor(
    private readonly repositoryResolver: WorkflowRepositoryResolver,
    private readonly repoCache: IRepoCacheService
  ) {}

  /**
   * Find the first repository linked to a workflow.
   *
   * @param workflowId - Workflow ID
   * @returns Repository reference or null when the workflow has no linked repository
   */
  async resolveRepository(workflowId: string): Promise<RepositoryReference | null> {
    return this.repositoryResolver.resolveRepository(workflowId)
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
      const repository = await this.repositoryResolver.resolveRepository(workflowId)
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
      const repositories = await this.repositoryResolver.resolveAllRepositories(workflowId)
      const paths: string[] = []

      for (const repository of repositories) {
        try {
          paths.push(await this.ensureLocalClone(repository))
        } catch (error) {
          console.warn(`[RepositoryContext] Skipping repository ${repository.name}: ${describe(error)}`)
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
