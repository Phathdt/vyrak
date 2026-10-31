import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

import { WorkflowStatus } from '../../domain'

import type {
  CreateWorkflowInput,
  IWorkflowRepository,
  IWorkflowRepositoryRepository,
  IWorkflowService,
  ListWorkflowsQuery,
  PaginatedWorkflowsResult,
  UpdateWorkflowInput,
  WorkflowType,
  WorkflowWithRelations,
} from '../../domain'

@Injectable()
export class WorkflowService implements IWorkflowService {
  constructor(
    private readonly workflowRepository: IWorkflowRepository,
    private readonly workflowRepositoryRepository: IWorkflowRepositoryRepository
  ) {}

  async create(
    _organizationId: string,
    projectId: string,
    createdById: string,
    data: CreateWorkflowInput
  ): Promise<WorkflowWithRelations> {
    const workflow = await this.workflowRepository.create(projectId, createdById, {
      title: data.title,
      description: data.description,
    })

    await this.workflowRepositoryRepository.createMany(workflow.id, data.repositoryIds)

    const repositories = await this.workflowRepositoryRepository.findByWorkflowId(workflow.id)

    return {
      ...workflow,
      repositories,
    }
  }

  async findById(_organizationId: string, id: string): Promise<WorkflowWithRelations | null> {
    const workflow = await this.workflowRepository.findById(id)

    if (!workflow) {
      return null
    }

    const repositories = await this.workflowRepositoryRepository.findByWorkflowId(id)

    return {
      ...workflow,
      repositories,
    }
  }

  async findAll(
    _organizationId: string,
    projectId: string,
    query: ListWorkflowsQuery
  ): Promise<PaginatedWorkflowsResult> {
    const skip = (query.page - 1) * query.limit

    const [workflows, total] = await Promise.all([
      this.workflowRepository.findAll(projectId, {
        search: query.search,
        type: query.type,
        status: query.status,
        createdById: query.createdById,
        sort: query.sort,
        order: query.order,
        skip,
        take: query.limit,
      }),
      this.workflowRepository.count(projectId, {
        search: query.search,
        type: query.type,
        status: query.status,
        createdById: query.createdById,
      }),
    ])

    const workflowIds = workflows.map((w) => w.id)
    const allRepositories = await Promise.all(
      workflowIds.map((id) => this.workflowRepositoryRepository.findByWorkflowId(id))
    )

    const items = workflows.map((workflow, index) => ({
      ...workflow,
      repositories: allRepositories[index],
    }))

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    }
  }

  async update(_organizationId: string, id: string, data: UpdateWorkflowInput) {
    const workflow = await this.workflowRepository.findById(id)

    if (!workflow) {
      throw new NotFoundException('Workflow not found')
    }

    if (workflow.status !== WorkflowStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT workflows can be updated')
    }

    return this.workflowRepository.update(id, data)
  }

  async delete(_organizationId: string, id: string): Promise<void> {
    const workflow = await this.workflowRepository.findById(id)

    if (!workflow) {
      throw new NotFoundException('Workflow not found')
    }

    if (workflow.status !== WorkflowStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT workflows can be deleted')
    }

    await this.workflowRepositoryRepository.deleteByWorkflowId(id)
    await this.workflowRepository.delete(id)
  }

  async startBrainstorming(_organizationId: string, id: string): Promise<void> {
    const workflow = await this.workflowRepository.findById(id)

    if (!workflow) {
      throw new NotFoundException('Workflow not found')
    }

    if (workflow.status !== WorkflowStatus.DRAFT) {
      throw new BadRequestException('Can only start brainstorming from DRAFT status')
    }

    await this.workflowRepository.updateStatus(id, WorkflowStatus.BRAINSTORMING)
  }

  async confirmClassification(
    _organizationId: string,
    id: string,
    type: WorkflowType,
    confirmedById: string
  ): Promise<void> {
    const workflow = await this.workflowRepository.findById(id)

    if (!workflow) {
      throw new NotFoundException('Workflow not found')
    }

    if (workflow.status !== WorkflowStatus.CLASSIFICATION_PENDING && workflow.status !== WorkflowStatus.BRAINSTORMING) {
      throw new BadRequestException('Can only confirm classification from BRAINSTORMING or CLASSIFICATION_PENDING')
    }

    await this.workflowRepository.updateType(id, type, confirmedById)
    await this.workflowRepository.updateStatus(id, WorkflowStatus.ACTIVE)
  }
}
