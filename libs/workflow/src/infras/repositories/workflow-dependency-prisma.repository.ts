import { BaseTenantRepository, type WorkflowDependency } from '@vyrak/database'

import { WorkflowDependencyType } from '../../domain/entities'

import type { WorkflowDependencyEntity } from '../../domain/entities'
import type { IWorkflowDependencyRepository } from '../../domain/interfaces/workflow-dependency-repository.interface'

export class WorkflowDependencyPrismaRepository extends BaseTenantRepository implements IWorkflowDependencyRepository {
  private mapToEntity(raw: WorkflowDependency): WorkflowDependencyEntity {
    return {
      id: raw.id,
      organizationId: raw.organizationId,
      workflowId: raw.workflowId,
      dependentItemId: raw.dependentItemId,
      dependsOnItemId: raw.dependsOnItemId,
      type: raw.type as WorkflowDependencyType,
      createdAt: raw.createdAt,
    }
  }

  async findByWorkflowId(workflowId: string): Promise<WorkflowDependencyEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const deps = await this.prisma.client.workflowDependency.findMany({
        where: {
          workflowId,
          organizationId,
        },
      })

      return deps.map((dep) => this.mapToEntity(dep))
    })
  }

  async findByDependentItemId(dependentItemId: string): Promise<WorkflowDependencyEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const deps = await this.prisma.client.workflowDependency.findMany({
        where: {
          dependentItemId,
          organizationId,
        },
      })

      return deps.map((dep) => this.mapToEntity(dep))
    })
  }

  async findByDependsOnItemId(dependsOnItemId: string): Promise<WorkflowDependencyEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const deps = await this.prisma.client.workflowDependency.findMany({
        where: {
          dependsOnItemId,
          organizationId,
        },
      })

      return deps.map((dep) => this.mapToEntity(dep))
    })
  }

  async create(
    workflowId: string,
    dependentItemId: string,
    dependsOnItemId: string,
    type = WorkflowDependencyType.BLOCKS
  ): Promise<WorkflowDependencyEntity> {
    return this.withTenantContext(async (organizationId) => {
      const dep = await this.prisma.client.workflowDependency.create({
        data: {
          organizationId,
          workflowId,
          dependentItemId,
          dependsOnItemId,
          type,
        },
      })

      return this.mapToEntity(dep)
    })
  }

  async delete(id: string): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflowDependency.delete({
        where: {
          id,
          organizationId,
        },
      })
    })
  }
}
