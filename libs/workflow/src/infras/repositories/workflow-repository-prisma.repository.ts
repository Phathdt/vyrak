import { BaseTenantRepository, type WorkflowRepository } from '@vyrak/database'

import type { WorkflowRepositoryEntity } from '../../domain/entities'
import type { IWorkflowRepositoryRepository } from '../../domain/interfaces/workflow-repository-repository.interface'

export class WorkflowRepositoryPrismaRepository extends BaseTenantRepository implements IWorkflowRepositoryRepository {
  private mapToEntity(raw: WorkflowRepository): WorkflowRepositoryEntity {
    return {
      id: raw.id,
      organizationId: raw.organizationId,
      workflowId: raw.workflowId,
      repositoryId: raw.repositoryId,
      createdAt: raw.createdAt,
    }
  }

  async findByWorkflowId(workflowId: string): Promise<WorkflowRepositoryEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const links = await this.prisma.client.workflowRepository.findMany({
        where: {
          workflowId,
          organizationId,
        },
      })

      return links.map((link) => this.mapToEntity(link))
    })
  }

  async create(workflowId: string, repositoryId: string): Promise<WorkflowRepositoryEntity> {
    return this.withTenantContext(async (organizationId) => {
      const link = await this.prisma.client.workflowRepository.create({
        data: {
          organizationId,
          workflowId,
          repositoryId,
        },
      })

      return this.mapToEntity(link)
    })
  }

  async createMany(workflowId: string, repositoryIds: string[]): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflowRepository.createMany({
        data: repositoryIds.map((repositoryId) => ({
          organizationId,
          workflowId,
          repositoryId,
        })),
      })
    })
  }

  async delete(id: string): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflowRepository.delete({
        where: {
          id,
          organizationId,
        },
      })
    })
  }

  async deleteByWorkflowId(workflowId: string): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflowRepository.deleteMany({
        where: {
          workflowId,
          organizationId,
        },
      })
    })
  }
}
