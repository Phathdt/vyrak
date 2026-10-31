import type { GitRepositoryEntity } from '../entities/git-repository.entity'

export interface IGitRepositoryRepository {
  findByProjectId(projectId: string): Promise<GitRepositoryEntity[]>
}
