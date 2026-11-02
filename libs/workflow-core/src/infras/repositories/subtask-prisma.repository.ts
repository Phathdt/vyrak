import { BaseTenantRepository, type Prisma, type WorkflowWorkItem } from '@vyrak/database'

import { SubTaskStatus, SubTaskDependencyType, SubTaskAgentRole } from '../../domain/entities/subtask.entity'

import type { SubTaskEntity, CreateSubTaskData, ISubTaskRepository, UpdateSubTaskData } from '../../domain'

export class SubTaskPrismaRepository extends BaseTenantRepository implements ISubTaskRepository {
  private mapToEntity(raw: WorkflowWorkItem): SubTaskEntity {
    return {
      id: raw.id,
      organizationId: raw.organizationId,
      workflowId: raw.workflowId,
      phaseId: raw.phaseId,
      key: raw.key,
      type: raw.type,
      title: raw.title,
      description: raw.description,
      parentId: raw.parentId,
      acceptanceCriteria: raw.acceptanceCriteria as Record<string, unknown> | null,
      status: raw.status as SubTaskStatus,
      dependencyType: raw.dependencyType as SubTaskDependencyType,
      executionOrder: raw.executionOrder,
      assignedAgentRole: raw.assignedAgentRole as SubTaskAgentRole | null,
      priority: raw.priority,
      estimate: raw.estimate as Record<string, unknown> | null,
      sequence: raw.sequence,
      metadata: raw.metadata as Record<string, unknown> | null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    }
  }

  async findById(id: string): Promise<SubTaskEntity | null> {
    return this.withTenantContext(async (organizationId) => {
      const item = await this.prisma.client.workflowWorkItem.findFirst({
        where: {
          id,
          organizationId,
        },
      })

      return item ? this.mapToEntity(item) : null
    })
  }

  async findByWorkflowId(workflowId: string): Promise<SubTaskEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const items = await this.prisma.client.workflowWorkItem.findMany({
        where: {
          workflowId,
          organizationId,
        },
        orderBy: [{ executionOrder: 'asc' }, { sequence: 'asc' }],
      })

      return items.map((item) => this.mapToEntity(item))
    })
  }

  async findByPhaseId(phaseId: string): Promise<SubTaskEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const items = await this.prisma.client.workflowWorkItem.findMany({
        where: {
          phaseId,
          organizationId,
        },
        orderBy: [{ executionOrder: 'asc' }, { sequence: 'asc' }],
      })

      return items.map((item) => this.mapToEntity(item))
    })
  }

  async findByStatus(workflowId: string, status: SubTaskStatus): Promise<SubTaskEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      const items = await this.prisma.client.workflowWorkItem.findMany({
        where: {
          workflowId,
          organizationId,
          status,
        },
        orderBy: [{ executionOrder: 'asc' }, { sequence: 'asc' }],
      })

      return items.map((item) => this.mapToEntity(item))
    })
  }

  async findReadyTasks(workflowId: string): Promise<SubTaskEntity[]> {
    return this.withTenantContext(async (organizationId) => {
      // Find all tasks with READY status
      const readyTasks = await this.prisma.client.workflowWorkItem.findMany({
        where: {
          workflowId,
          organizationId,
          status: SubTaskStatus.READY,
        },
        orderBy: [{ executionOrder: 'asc' }, { sequence: 'asc' }],
      })

      // Filter tasks whose dependencies are all satisfied
      const tasksWithSatisfiedDeps: SubTaskEntity[] = []

      for (const task of readyTasks) {
        const dependencies = await this.findDependencies(task.id)

        if (dependencies.length === 0) {
          // No dependencies, task is ready
          tasksWithSatisfiedDeps.push(this.mapToEntity(task))
          continue
        }

        // Check if all dependencies are completed
        const depStatuses = await this.prisma.client.workflowWorkItem.findMany({
          where: {
            id: { in: dependencies },
            organizationId,
          },
          select: {
            status: true,
          },
        })

        const allCompleted = depStatuses.every((dep) => dep.status === SubTaskStatus.COMPLETED)
        if (allCompleted) {
          tasksWithSatisfiedDeps.push(this.mapToEntity(task))
        }
      }

      return tasksWithSatisfiedDeps
    })
  }

  async findDependencies(taskId: string): Promise<string[]> {
    return this.withTenantContext(async (organizationId) => {
      const deps = await this.prisma.client.workflowDependency.findMany({
        where: {
          dependentItemId: taskId,
          organizationId,
        },
        select: {
          dependsOnItemId: true,
        },
      })

      return deps.map((dep) => dep.dependsOnItemId)
    })
  }

  async create(workflowId: string, data: CreateSubTaskData): Promise<SubTaskEntity> {
    return this.withTenantContext(async (organizationId) => {
      const item = await this.prisma.client.workflowWorkItem.create({
        data: {
          organizationId,
          workflowId,
          phaseId: data.phaseId ?? null,
          key: data.key,
          type: data.type,
          title: data.title,
          description: data.description ?? null,
          parentId: data.parentId ?? null,
          acceptanceCriteria: (data.acceptanceCriteria ?? null) as Prisma.InputJsonValue,
          status: SubTaskStatus.PENDING,
          dependencyType: data.dependencyType ?? 'INDEPENDENT',
          executionOrder: data.executionOrder ?? 0,
          assignedAgentRole: data.assignedAgentRole ?? null,
          priority: data.priority ?? null,
          estimate: (data.estimate ?? null) as Prisma.InputJsonValue,
          sequence: data.sequence ?? 0,
          metadata: (data.metadata ?? null) as Prisma.InputJsonValue,
        },
      })

      return this.mapToEntity(item)
    })
  }

  async update(id: string, data: UpdateSubTaskData): Promise<SubTaskEntity> {
    return this.withTenantContext(async (organizationId) => {
      const updateData: Prisma.WorkflowWorkItemUpdateInput = {}

      if (data.phaseId !== undefined) updateData.phaseId = data.phaseId
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.status !== undefined) updateData.status = data.status
      if (data.dependencyType !== undefined) updateData.dependencyType = data.dependencyType
      if (data.executionOrder !== undefined) updateData.executionOrder = data.executionOrder
      if (data.assignedAgentRole !== undefined) updateData.assignedAgentRole = data.assignedAgentRole
      if (data.priority !== undefined) updateData.priority = data.priority
      if (data.estimate !== undefined) updateData.estimate = data.estimate as Prisma.InputJsonValue
      if (data.sequence !== undefined) updateData.sequence = data.sequence
      if (data.metadata !== undefined) updateData.metadata = data.metadata as Prisma.InputJsonValue

      const item = await this.prisma.client.workflowWorkItem.update({
        where: {
          id,
          organizationId,
        },
        data: updateData,
      })

      return this.mapToEntity(item)
    })
  }

  async updateStatus(id: string, status: SubTaskStatus): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflowWorkItem.update({
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

  async delete(id: string): Promise<void> {
    await this.withTenantContext(async (organizationId) => {
      await this.prisma.client.workflowWorkItem.delete({
        where: {
          id,
          organizationId,
        },
      })
    })
  }
}
