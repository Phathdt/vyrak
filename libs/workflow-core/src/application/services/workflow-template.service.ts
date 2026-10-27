import { NotFoundException } from '@nestjs/common'
import type { WorkflowTemplate } from '@vyrak/database'

import type { IWorkflowTemplateRepository } from '../../domain/interfaces/workflow-template.repository.interface'

/**
 * Workflow Template Service Interface
 */
export interface IWorkflowTemplateService {
  listTemplates(): Promise<WorkflowTemplate[]>
  getTemplateById(id: string): Promise<WorkflowTemplate>
  getTemplateByKey(key: string): Promise<WorkflowTemplate>
  validateTemplate(id: string): Promise<boolean>
}

/**
 * Workflow Template Service
 *
 * Manages workflow templates for story-based workflows
 * Plain TypeScript class - no @Injectable decorator per CLAUDE.md rules
 */
export class WorkflowTemplateService implements IWorkflowTemplateService {
  constructor(private readonly repository: IWorkflowTemplateRepository) {}

  async listTemplates(): Promise<WorkflowTemplate[]> {
    return this.repository.findAllActive()
  }

  async getTemplateById(id: string): Promise<WorkflowTemplate> {
    const template = await this.repository.findById(id)

    if (!template) {
      throw new NotFoundException(`Workflow template with ID ${id} not found`)
    }

    return template
  }

  async getTemplateByKey(key: string): Promise<WorkflowTemplate> {
    const template = await this.repository.findByKey(key)

    if (!template) {
      throw new NotFoundException(`Workflow template with key ${key} not found`)
    }

    return template
  }

  async validateTemplate(id: string): Promise<boolean> {
    return this.repository.isActive(id)
  }
}
