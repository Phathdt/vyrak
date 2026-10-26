import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ARTIFACT_MANAGER, type ArtifactEntity, type IArtifactManager } from '@vyrak/agent-runtime'
import { DatabaseService } from '@vyrak/database'
import {
  EVENT_REPOSITORY,
  STEP_REPOSITORY,
  WORKFLOW_REPOSITORY,
  type IEventRepository,
  type IStepRepository,
  type IWorkflowRepository,
  type StepRun,
  type WorkflowEventEntity,
  type WorkflowRun,
} from '@vyrak/workflow-core'

import { ListWorkflowRunsDto, PaginatedWorkflowRunsDto } from './dto'
import { toWorkflowRunSummaryDto } from './mappers/workflow-run.mapper'

/**
 * Service for workflow operations
 * Handles authorization, tenant isolation, and data fetching
 * Tenant filtering is automatically applied via DatabaseService AsyncLocalStorage
 */
@Injectable()
export class WorkflowsService {
  constructor(
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: IWorkflowRepository,
    private readonly databaseService: DatabaseService,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepo: IEventRepository,
    @Inject(ARTIFACT_MANAGER)
    private readonly artifactManager: IArtifactManager,
    @Inject(STEP_REPOSITORY)
    private readonly stepRepo: IStepRepository
  ) {}

  /**
   * Verify project exists
   * Tenant filter is automatically applied by DatabaseService
   */
  async verifyProjectExists(projectId: string): Promise<void> {
    const project = await this.databaseService.client.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    })

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`)
    }
  }

  /**
   * Get workflow run by ID
   * Tenant filter is automatically applied by DatabaseService
   */
  async getWorkflowRun(runId: string): Promise<WorkflowRun> {
    const run = await this.workflowRepo.findRunById(runId)

    if (!run) {
      throw new NotFoundException(`Workflow run ${runId} not found`)
    }

    return run
  }

  /**
   * List workflow runs with filters and pagination
   * Tenant filter is automatically applied by DatabaseService
   */
  async listWorkflowRuns(organizationId: string, query: ListWorkflowRunsDto): Promise<PaginatedWorkflowRunsDto> {
    // Build filters according to FindRunsParams interface
    const findParams = {
      organizationId,
      projectId: query.projectId,
      status: query.status,
      skip: (query.page - 1) * query.limit,
      limit: query.limit,
    }

    // Fetch runs with count (returns tuple [WorkflowRun[], number])
    const [runs, total] = await this.workflowRepo.findRunsWithCount(findParams)

    // Get requirements from input for summaries
    const items = runs.map((run: WorkflowRun) => {
      const requirement = (run.input?.requirement as string) || 'No requirement provided'
      return toWorkflowRunSummaryDto(run, requirement)
    })

    const totalPages = Math.ceil(total / query.limit)

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages,
    }
  }

  /**
   * Get steps for a workflow run
   * Tenant filter is automatically applied by DatabaseService
   */
  async getSteps(runId: string): Promise<StepRun[]> {
    // Verify workflow run exists and user has access (tenant filter applied)
    await this.getWorkflowRun(runId)

    // Fetch steps ordered by creation time
    const steps = await this.stepRepo.findStepsByRunId(runId)

    return steps
  }

  /**
   * Get events for a workflow run with pagination
   * Tenant filter is automatically applied by DatabaseService
   */
  async getEvents(
    runId: string,
    limit: number,
    offset: number
  ): Promise<{ events: WorkflowEventEntity[]; total: number }> {
    // Verify workflow run exists and user has access (tenant filter applied)
    await this.getWorkflowRun(runId)

    // Fetch events with pagination
    const [events, total] = await Promise.all([
      this.eventRepo.findEventsByRunId(runId, limit, offset),
      this.eventRepo.countByRunId(runId),
    ])

    return { events, total }
  }

  /**
   * List artifacts for a workflow run
   * Tenant filter is automatically applied by DatabaseService
   */
  async listArtifacts(runId: string): Promise<ArtifactEntity[]> {
    // Verify workflow run exists and user has access (tenant filter applied)
    await this.getWorkflowRun(runId)

    // List artifacts by run ID
    const artifacts = await this.artifactManager.listArtifactsByRun(runId)

    return artifacts
  }

  /**
   * Get artifact by ID
   * Tenant filter is automatically applied by DatabaseService
   */
  async getArtifact(runId: string, artifactId: string): Promise<ArtifactEntity> {
    // Verify workflow run exists and user has access (tenant filter applied)
    await this.getWorkflowRun(runId)

    // Get artifact
    const artifact = await this.artifactManager.getArtifact(artifactId)

    if (!artifact) {
      throw new NotFoundException(`Artifact ${artifactId} not found`)
    }

    // Verify artifact belongs to this run
    if (artifact.runId !== runId) {
      throw new NotFoundException(`Artifact ${artifactId} not found in run ${runId}`)
    }

    return artifact
  }
}
