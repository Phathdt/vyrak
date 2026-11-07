import { BaseTenantRepository } from '@vyrak/database'

import type { GitRepositoryEntity } from '../../domain/entities/git-repository.entity'
import type {
  CreateGitRepositoryData,
  IGitRepositoryRepository,
} from '../../domain/interfaces/git-repository-repository.interface'
import type { GitRepository as PrismaGitRepository } from '@vyrak/database'

export class GitRepositoryPrismaRepository extends BaseTenantRepository implements IGitRepositoryRepository {
  private mapToEntity(row: PrismaGitRepository): GitRepositoryEntity {
    return {
      id: row.id,
      projectId: row.projectId,
      organizationId: row.organizationId,
      name: row.name,
      url: row.url,
      branch: row.branch,
      provider: row.provider,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async findByProjectId(projectId: string): Promise<GitRepositoryEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const rows = await this.prisma.client.gitRepository.findMany({
        where: {
          projectId,
          organizationId,
        },
        orderBy: { name: 'asc' },
      })

      return rows.map((row) => this.mapToEntity(row))
    })
  }

  async findById(id: string): Promise<GitRepositoryEntity | null> {
    return this.withTenantContext(async (organizationId) => {
      const repository = await this.prisma.client.gitRepository.findFirst({
        where: {
          id,
          organizationId,
        },
      })

      if (!repository) {
        return null
      }

      return this.mapToEntity(repository)
    })
  }

  async findByUrl(projectId: string, url: string): Promise<GitRepositoryEntity | null> {
    return this.withTenantContext(async (organizationId) => {
      const repository = await this.prisma.client.gitRepository.findFirst({
        where: {
          projectId,
          url,
          organizationId,
        },
      })

      if (!repository) {
        return null
      }

      return this.mapToEntity(repository)
    })
  }

  async create(data: CreateGitRepositoryData): Promise<GitRepositoryEntity> {
    return this.withTenantContext(async (_organizationId) => {
      const repository = await this.prisma.client.gitRepository.create({
        data: {
          organizationId: data.organizationId,
          projectId: data.projectId,
          name: data.name,
          url: data.url,
          branch: data.branch,
          provider: data.provider,
          status: data.status,
        },
      })

      return this.mapToEntity(repository)
    })
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.gitRepository.updateMany({
        where: {
          id,
          organizationId,
        },
        data: {
          status,
        },
      })
    })
  }
}
