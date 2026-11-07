import type { IWorkflowRepositoryRepository } from '../../domain/interfaces'
import type { IGitRepositoryRepository } from '@vyrak/project'
import type { RepositoryReference } from '@vyrak/repository'

/**
 * Service to resolve repository references for workflows.
 * Database-only operations - no file system access.
 * Safe to use in api-server for metadata queries.
 */
export class WorkflowRepositoryResolver {
  constructor(
    private readonly workflowRepositoryRepository: IWorkflowRepositoryRepository,
    private readonly gitRepositoryRepository: IGitRepositoryRepository
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
   * Resolve all repository references for a workflow.
   * Useful when a workflow is linked to multiple repositories.
   *
   * @param workflowId - Workflow ID
   * @returns Array of repository references
   */
  async resolveAllRepositories(workflowId: string): Promise<RepositoryReference[]> {
    try {
      const workflowRepos = await this.workflowRepositoryRepository.findByWorkflowId(workflowId)
      const references: RepositoryReference[] = []

      for (const workflowRepo of workflowRepos) {
        const gitRepo = await this.gitRepositoryRepository.findById(workflowRepo.repositoryId)
        if (!gitRepo) continue

        references.push({
          organizationId: gitRepo.organizationId,
          projectId: gitRepo.projectId,
          name: gitRepo.name,
          url: gitRepo.url,
          branch: gitRepo.branch,
        })
      }

      return references
    } catch (error) {
      console.warn(
        `[WorkflowRepositoryResolver] Repositories unavailable for workflow ${workflowId}: ${describe(error)}`
      )
      return []
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
