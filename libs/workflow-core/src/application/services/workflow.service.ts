import {
  DEFAULT_WORKFLOW_PHASE_DEFINITIONS,
  InvalidWorkflowStatusError,
  WorkflowNotFoundError,
  WorkflowPhaseStatus,
  WorkflowStatus,
} from '../../domain'

import type {
  CreateWorkflowInput,
  IWorkflowPhaseRepository,
  IWorkflowPhaseService,
  IWorkflowRepository,
  IWorkflowRepositoryRepository,
  IWorkflowService,
  ListWorkflowsQuery,
  PaginatedWorkflowsResult,
  UpdateWorkflowInput,
  WorkflowWithRelations,
} from '../../domain'

export class WorkflowService implements IWorkflowService {
  constructor(
    private readonly workflowRepository: IWorkflowRepository,
    private readonly workflowRepositoryRepository: IWorkflowRepositoryRepository,
    private readonly workflowPhaseService: IWorkflowPhaseService,
    private readonly workflowPhaseRepository: IWorkflowPhaseRepository
  ) {}

  async create(
    _organizationId: string,
    projectId: string,
    createdById: string,
    data: CreateWorkflowInput
  ): Promise<WorkflowWithRelations> {
    // Create workflow with type
    const workflow = await this.workflowRepository.create(projectId, createdById, {
      title: data.title,
      description: data.description,
    })

    // Set workflow type
    await this.workflowRepository.updateWorkflowType(workflow.id, data.type)

    // Auto-create 6 fixed phases for the workflow
    const createdPhases = await Promise.all(
      DEFAULT_WORKFLOW_PHASE_DEFINITIONS.map((phaseDef) =>
        this.workflowPhaseService.create(workflow.id, {
          name: phaseDef.name,
          key: phaseDef.key,
          sequence: phaseDef.sequence,
        })
      )
    )

    // Set first phase (Planning) to IN_PROGRESS
    const firstPhase = createdPhases[0]
    if (firstPhase) {
      await this.workflowRepository.updateDefinitionContext(workflow.id, {
        currentPhaseKey: firstPhase.key,
        definitionSnapshot: { type: data.type },
      })
      // Update first phase status to IN_PROGRESS and set startedAt
      await this.workflowPhaseRepository.updateStatus(firstPhase.id, WorkflowPhaseStatus.IN_PROGRESS)
      await this.workflowPhaseRepository.update(firstPhase.id, { startedAt: new Date() })
    }

    // Set workflow to ACTIVE status
    await this.workflowRepository.updateStatus(workflow.id, WorkflowStatus.ACTIVE)

    // Link repositories
    await this.workflowRepositoryRepository.createMany(workflow.id, data.repositoryIds)

    const repositories = await this.workflowRepositoryRepository.findByWorkflowId(workflow.id)

    // Fetch updated workflow with type and status
    const updatedWorkflow = await this.workflowRepository.findById(workflow.id)

    return {
      ...updatedWorkflow!,
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
      throw new WorkflowNotFoundError(id)
    }

    if (workflow.status !== WorkflowStatus.DRAFT) {
      throw new InvalidWorkflowStatusError('Only DRAFT workflows can be updated', workflow.status, [
        WorkflowStatus.DRAFT,
      ])
    }

    return this.workflowRepository.update(id, data)
  }

  async delete(_organizationId: string, id: string): Promise<void> {
    const workflow = await this.workflowRepository.findById(id)

    if (!workflow) {
      throw new WorkflowNotFoundError(id)
    }

    if (workflow.status !== WorkflowStatus.DRAFT) {
      throw new InvalidWorkflowStatusError('Only DRAFT workflows can be deleted', workflow.status, [
        WorkflowStatus.DRAFT,
      ])
    }

    await this.workflowRepositoryRepository.deleteByWorkflowId(id)
    await this.workflowRepository.delete(id)
  }
}
