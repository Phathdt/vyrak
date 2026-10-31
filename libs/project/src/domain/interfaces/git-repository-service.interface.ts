import type { GitRepositoryEntity } from '../entities/git-repository.entity'

export interface IGitRepositoryService {
  findAllByProject(organizationId: string, projectId: string): Promise<GitRepositoryEntity[]>
}
