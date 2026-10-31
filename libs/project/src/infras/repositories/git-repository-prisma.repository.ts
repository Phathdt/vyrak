import { BaseTenantRepository } from '@vyrak/database'

import type { GitRepositoryEntity } from '../../domain/entities/git-repository.entity'
import type { IGitRepositoryRepository } from '../../domain/interfaces/git-repository-repository.interface'
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
}
