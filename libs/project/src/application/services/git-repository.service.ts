import { NotFoundException } from '@nestjs/common'

import type { GitRepositoryEntity } from '../../domain/entities/git-repository.entity'
import type { IGitRepositoryRepository } from '../../domain/interfaces/git-repository-repository.interface'
import type { IGitRepositoryService } from '../../domain/interfaces/git-repository-service.interface'
import type { IProjectRepository } from '../../domain/interfaces/project-repository.interface'

export class GitRepositoryService implements IGitRepositoryService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly gitRepositoryRepository: IGitRepositoryRepository
  ) {}

  async findAllByProject(_organizationId: string, projectId: string): Promise<GitRepositoryEntity[]> {
    const project = await this.projectRepository.findOne(projectId)

    if (!project) {
      throw new NotFoundException('Project not found')
    }

    return this.gitRepositoryRepository.findByProjectId(projectId)
  }
}
