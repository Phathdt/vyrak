import type { GitRepositoryEntity } from '../entities/git-repository.entity'

export interface CreateGitRepositoryData {
  organizationId: string
  projectId: string
  name: string
  url: string
  branch: string
  provider: string
  status: string
}

export interface IGitRepositoryRepository {
  findByProjectId(projectId: string): Promise<GitRepositoryEntity[]>
  findById(id: string): Promise<GitRepositoryEntity | null>
  findByUrl(projectId: string, url: string): Promise<GitRepositoryEntity | null>
  create(data: CreateGitRepositoryData): Promise<GitRepositoryEntity>
  updateStatus(id: string, status: string): Promise<void>
}
