import { ProjectNotFoundError, RepositoryAlreadyConnectedError } from '../../domain/exceptions'

import type { GitRepositoryEntity } from '../../domain/entities/git-repository.entity'
import type { IGitRepositoryRepository } from '../../domain/interfaces/git-repository-repository.interface'
import type { IGitRepositoryService } from '../../domain/interfaces/git-repository-service.interface'
import type { IProjectRepository } from '../../domain/interfaces/project-repository.interface'
import type { CreateGitRepositoryDto } from '../../domain/schemas/git-repository.schemas'
import type { GitRepositoryValidationService } from './git-repository-validation.service'

export class GitRepositoryService implements IGitRepositoryService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly gitRepositoryRepository: IGitRepositoryRepository,
    private readonly validationService: GitRepositoryValidationService
  ) {}

  async findAllByProject(_organizationId: string, projectId: string): Promise<GitRepositoryEntity[]> {
    const project = await this.projectRepository.findOne(projectId)

    if (!project) {
      throw new ProjectNotFoundError(projectId)
    }

    return this.gitRepositoryRepository.findByProjectId(projectId)
  }

  async create(organizationId: string, projectId: string, dto: CreateGitRepositoryDto): Promise<GitRepositoryEntity> {
    // Verify project exists
    const project = await this.projectRepository.findOne(projectId)
    if (!project) {
      throw new ProjectNotFoundError(projectId)
    }

    // Validate GitHub App has access and get metadata
    const metadata = await this.validationService.validateAccess(dto.url)

    // Check for duplicate repository
    const existing = await this.gitRepositoryRepository.findByUrl(projectId, dto.url)
    if (existing) {
      throw new RepositoryAlreadyConnectedError(dto.url, projectId)
    }

    // Create repository record
    return this.gitRepositoryRepository.create({
      organizationId,
      projectId,
      name: metadata.repo,
      url: dto.url,
      branch: dto.branch || metadata.defaultBranch,
      provider: 'github',
      status: 'active',
    })
  }

  async delete(_organizationId: string, projectId: string, repositoryId: string): Promise<void> {
    // Verify project exists
    const project = await this.projectRepository.findOne(projectId)
    if (!project) {
      throw new ProjectNotFoundError(projectId)
    }

    // Verify repository exists and belongs to project
    const repository = await this.gitRepositoryRepository.findById(repositoryId)
    if (!repository || repository.projectId !== projectId) {
      throw new Error(`Repository ${repositoryId} not found in project ${projectId}`)
    }

    // Soft delete by updating status
    await this.gitRepositoryRepository.updateStatus(repositoryId, 'deleted')
  }
}
