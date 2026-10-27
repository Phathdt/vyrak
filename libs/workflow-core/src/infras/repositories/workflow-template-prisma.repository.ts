import type { PrismaClient, WorkflowTemplate } from '@vyrak/database'

import type { IWorkflowTemplateRepository } from '../../domain/interfaces/workflow-template.repository.interface'

export class WorkflowTemplatePrismaRepository implements IWorkflowTemplateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAllActive(): Promise<WorkflowTemplate[]> {
    return this.prisma.workflowTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
  }

  async findById(id: string): Promise<WorkflowTemplate | null> {
    return this.prisma.workflowTemplate.findUnique({
      where: { id },
    })
  }

  async findByKey(key: string): Promise<WorkflowTemplate | null> {
    return this.prisma.workflowTemplate.findUnique({
      where: { key },
    })
  }

  async isActive(id: string): Promise<boolean> {
    const template = await this.prisma.workflowTemplate.findUnique({
      where: { id },
      select: { isActive: true },
    })

    return template?.isActive ?? false
  }
}
