import type { DatabaseService, WorkflowTemplate } from '@vyrak/database'

import type { IWorkflowTemplateRepository } from '../../domain/interfaces/workflow-template.repository.interface'

export class WorkflowTemplatePrismaRepository implements IWorkflowTemplateRepository {
  constructor(private readonly db: DatabaseService) {}

  async findAllActive(): Promise<WorkflowTemplate[]> {
    return this.db.client.workflowTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
  }

  async findById(id: string): Promise<WorkflowTemplate | null> {
    return this.db.client.workflowTemplate.findUnique({
      where: { id },
    })
  }

  async findByKey(key: string): Promise<WorkflowTemplate | null> {
    return this.db.client.workflowTemplate.findUnique({
      where: { key },
    })
  }

  async isActive(id: string): Promise<boolean> {
    const template = await this.db.client.workflowTemplate.findUnique({
      where: { id },
      select: { isActive: true },
    })

    return template?.isActive ?? false
  }
}
