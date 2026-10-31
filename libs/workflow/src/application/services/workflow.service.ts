import { BadRequestException, NotFoundException } from '@nestjs/common'

import { WorkflowStatus, WorkflowType } from '../../domain/entities'

import type {
  CreateWorkflowDto,
  IWorkflowRepository,
  IWorkflowService,
  ListWorkflowsQueryDto,
  PaginatedWorkflows,
  UpdateWorkflowDto,
  WorkflowWithRepositories,
} from '../../domain'

export class WorkflowService implements IWorkflowService {
  constructor(private readonly repository: IWorkflowRepository) {}

  async create(
    _organizationId: string,
    projectId: string,
    createdById: string,
    data: CreateWorkflowDto
  ): Promise<WorkflowWithRepositories> {
    if (data.repositoryIds.length === 0) {
      throw new BadRequestException('At least one repository is required')
    }

    return this.repository.create(projectId, createdById, data)
  }

  async findAll(_organizationId: string, projectId: string, query: ListWorkflowsQueryDto): Promise<PaginatedWorkflows> {
    return this.repository.findAll(projectId, query)
  }

  async findOne(_organizationId: string, id: string): Promise<WorkflowWithRepositories> {
    const workflow = await this.repository.findOne(id)

    if (!workflow) {
      throw new NotFoundException('Workflow not found')
    }

    return workflow
  }

  async update(_organizationId: string, id: string, data: UpdateWorkflowDto): Promise<WorkflowWithRepositories> {
    const existing = await this.repository.findOne(id)

    if (!existing) {
      throw new NotFoundException('Workflow not found')
    }

    if (existing.status !== WorkflowStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT workflows can be updated')
    }

    return this.repository.update(id, data)
  }

  async delete(_organizationId: string, id: string): Promise<void> {
    const existing = await this.repository.findOne(id)

    if (!existing) {
      throw new NotFoundException('Workflow not found')
    }

    if (existing.status !== WorkflowStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT workflows can be deleted')
    }

    await this.repository.delete(id)
  }

  async startBrainstorming(_organizationId: string, id: string): Promise<void> {
    const workflow = await this.repository.findOne(id)

    if (!workflow) {
      throw new NotFoundException('Workflow not found')
    }

    if (workflow.status !== WorkflowStatus.DRAFT) {
      throw new BadRequestException('Can only start brainstorming from DRAFT status')
    }

    await this.repository.updateStatus(id, WorkflowStatus.BRAINSTORMING)
  }

  async confirmClassification(
    _organizationId: string,
    id: string,
    type: WorkflowType,
    confirmedById: string
  ): Promise<void> {
    const workflow = await this.repository.findOne(id)

    if (!workflow) {
      throw new NotFoundException('Workflow not found')
    }

    if (workflow.status !== WorkflowStatus.CLASSIFICATION_PENDING && workflow.status !== WorkflowStatus.BRAINSTORMING) {
      throw new BadRequestException('Can only confirm classification from BRAINSTORMING or CLASSIFICATION_PENDING')
    }

    await this.repository.confirmClassification(id, type, confirmedById)
    await this.repository.updateStatus(id, WorkflowStatus.ACTIVE)
  }
}
