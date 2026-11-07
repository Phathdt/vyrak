import type { GitRepositoryEntity } from '../entities/git-repository.entity'
import type { CreateGitRepositoryDto } from '../schemas/git-repository.schemas'

export interface IGitRepositoryService {
  findAllByProject(organizationId: string, projectId: string): Promise<GitRepositoryEntity[]>
  create(organizationId: string, projectId: string, dto: CreateGitRepositoryDto): Promise<GitRepositoryEntity>
  delete(organizationId: string, projectId: string, repositoryId: string): Promise<void>
}
