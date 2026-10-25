import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import type { ArtifactEntity, IArtifactManager } from '@vyrak/agent-runtime'
import { ARTIFACT_MANAGER } from '@vyrak/agent-runtime'
import { DatabaseService } from '@vyrak/database'
import {
  CANCEL_WORKFLOW_USE_CASE,
  EVENT_REPOSITORY,
  STEP_REPOSITORY,
  WORKFLOW_REPOSITORY,
  type CancelWorkflowUseCase,
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
 */
@Injectable()
export class WorkflowsService {
  constructor(
    @Inject(WORKFLOW_REPOSITORY)
    private readonly workflowRepo: IWorkflowRepository,
    private readonly databaseService: DatabaseService,
    @Inject(CANCEL_WORKFLOW_USE_CASE)
    private readonly cancelWorkflowUseCase: CancelWorkflowUseCase,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepo: IEventRepository,
    @Inject(ARTIFACT_MANAGER)
    private readonly artifactManager: IArtifactManager,
    @Inject(STEP_REPOSITORY)
    private readonly stepRepo: IStepRepository
  ) {}

  /**
   * Get project by ID and verify it exists
   */
  async getProject(projectId: string): Promise<{ organizationId: string; name: string }> {
    const project = await this.databaseService.client.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true, name: true },
    })

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`)
    }

    return project
  }

  /**
   * Get workflow run by ID with authorization check
   * Ensures user has access to the workflow run's organization
   */
  async getWorkflowRun(runId: string, userId: string): Promise<WorkflowRun> {
    const run = await this.workflowRepo.findRunById(runId)

    if (!run) {
      throw new NotFoundException(`Workflow run ${runId} not found`)
    }

    // Verify user has access to the organization
    await this.verifyOrganizationAccess(run.organizationId, userId)

    return run
  }

  /**
   * Get workflow run for approval operations
   * Similar to getWorkflowRun but optimized for approval endpoints
   */
  async getWorkflowRunForApproval(runId: string, userId: string): Promise<WorkflowRun> {
    return this.getWorkflowRun(runId, userId)
  }

  /**
   * List workflow runs with filters and pagination
   * Scoped to organizations the user has access to
   */
  async listWorkflowRuns(query: ListWorkflowRunsDto, userId: string): Promise<PaginatedWorkflowRunsDto> {
    // Get all organizations the user has access to
    const userOrgs = await this.getUserOrganizations(userId)
    const orgIds = userOrgs.map((org) => org.id)

    if (orgIds.length === 0) {
      return {
        items: [],
        total: 0,
        page: query.page,
        limit: query.limit,
        totalPages: 0,
      }
    }

    // If projectId filter is provided, verify it belongs to user's organization
    if (query.projectId) {
      const project = await this.databaseService.client.project.findUnique({
        where: { id: query.projectId },
        select: { organizationId: true },
      })

      if (!project || !orgIds.includes(project.organizationId)) {
        throw new UnauthorizedException('No access to the specified project')
      }
    }

    // Build filters according to FindRunsParams interface
    const findParams = {
      organizationId: orgIds[0], // Primary org, will be adjusted for multi-org support
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
   * Cancel a workflow run
   */
  async cancelWorkflow(runId: string, userId: string, reason: string): Promise<void> {
    const run = await this.getWorkflowRun(runId, userId)

    await this.cancelWorkflowUseCase.execute({
      runId,
      userId,
      organizationId: run.organizationId,
      projectId: run.projectId,
      reason,
    })
  }

  /**
   * Get steps for a workflow run
   */
  async getSteps(runId: string, userId: string): Promise<StepRun[]> {
    // Verify user has access to the workflow run
    await this.getWorkflowRun(runId, userId)

    // Fetch steps ordered by creation time
    const steps = await this.stepRepo.findStepsByRunId(runId)

    return steps
  }

  /**
   * Get events for a workflow run with pagination
   */
  async getEvents(
    runId: string,
    userId: string,
    limit: number,
    offset: number
  ): Promise<{ events: WorkflowEventEntity[]; total: number }> {
    // Verify user has access to the workflow run
    await this.getWorkflowRun(runId, userId)

    // Fetch events with pagination
    const [events, total] = await Promise.all([
      this.eventRepo.findEventsByRunId(runId, limit, offset),
      this.eventRepo.countByRunId(runId),
    ])

    return { events, total }
  }

  /**
   * List artifacts for a workflow run
   */
  async listArtifacts(runId: string, userId: string): Promise<ArtifactEntity[]> {
    // Verify access
    await this.getWorkflowRun(runId, userId)

    // List artifacts by run ID
    const artifacts = await this.artifactManager.listArtifactsByRun(runId)

    return artifacts
  }

  /**
   * Get artifact by ID
   */
  async getArtifact(runId: string, artifactId: string, userId: string): Promise<ArtifactEntity> {
    // Verify access to run
    await this.getWorkflowRun(runId, userId)

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

  /**
   * Verify user has access to an organization
   */
  private async verifyOrganizationAccess(organizationId: string, userId: string): Promise<void> {
    const member = await this.databaseService.withSystemAccess(async () => {
      return this.databaseService.client.member.findFirst({
        where: {
          organizationId,
          userId,
        },
      })
    })

    if (!member) {
      throw new UnauthorizedException('No access to this organization')
    }
  }

  /**
   * Get all organizations the user is a member of
   */
  private async getUserOrganizations(userId: string): Promise<Array<{ id: string; name: string }>> {
    const memberships = await this.databaseService.withSystemAccess(async () => {
      return this.databaseService.client.member.findMany({
        where: { userId },
        include: {
          organization: {
            select: { id: true, name: true },
          },
        },
      })
    })

    return memberships.map((m: { organization: { id: string; name: string } }) => m.organization)
  }
}
