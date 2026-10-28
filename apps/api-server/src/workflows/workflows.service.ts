import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ARTIFACT_MANAGER, type ArtifactEntity, type IArtifactManager } from '@vyrak/agent-runtime'
import { DatabaseService, type Story, type WorkflowTemplate } from '@vyrak/database'
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
   * Generate pre-signed URL for artifact upload
   */
  async generateUploadUrl(
    orgId: string,
    runId: string,
    dto: { filePath: string; contentType?: string }
  ): Promise<{ uploadUrl: string; s3Key: string; bucket: string; expiresIn: number }> {
    // Verify workflow run exists and user has access
    await this.getWorkflowRun(runId)

    return this.artifactManager.generateUploadUrl({
      organizationId: orgId,
      runId,
      filePath: dto.filePath,
      contentType: dto.contentType,
    })
  }

  /**
   * Confirm artifact upload and save metadata
   */
  async confirmUpload(
    orgId: string,
    runId: string,
    dto: {
      s3Key: string
      s3Bucket: string
      contentSize: number
      contentType: string
      filePath: string
    }
  ): Promise<string> {
    // Verify workflow run exists and user has access
    await this.getWorkflowRun(runId)

    return this.artifactManager.confirmUpload({
      organizationId: orgId,
      runId,
      filePath: dto.filePath,
      s3Key: dto.s3Key,
      s3Bucket: dto.s3Bucket,
      contentSize: dto.contentSize,
      contentType: dto.contentType,
    })
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

  /**
   * List all active workflow templates
   */
  async listActiveTemplates(): Promise<WorkflowTemplate[]> {
    return this.databaseService.client.workflowTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
  }

  /**
   * Get workflow template by ID
   */
  async getTemplateById(templateId: string): Promise<WorkflowTemplate> {
    const template = await this.databaseService.client.workflowTemplate.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`)
    }

    return template
  }

  /**
   * Get stories for a workflow run
   * Ordered by order_index
   */
  async getStories(runId: string): Promise<Story[]> {
    // Verify workflow run exists and user has access
    await this.getWorkflowRun(runId)

    return this.databaseService.client.story.findMany({
      where: { workflowRunId: runId },
      orderBy: { orderIndex: 'asc' },
    })
  }

  /**
   * Pause workflow after a story completes
   */
  async pauseAfterStory(runId: string, storyId: string, userId: string): Promise<void> {
    // Verify story exists and belongs to this workflow
    const story = await this.databaseService.client.story.findFirst({
      where: {
        id: storyId,
        workflowRunId: runId,
      },
    })

    if (!story) {
      throw new NotFoundException(`Story ${storyId} not found in workflow ${runId}`)
    }

    // Cannot pause if story already completed or failed
    if (['completed', 'failed', 'skipped'].includes(story.status)) {
      throw new BadRequestException(`Cannot pause after story in ${story.status} state`)
    }

    // Mark story to pause after completion
    await this.databaseService.client.story.update({
      where: { id: storyId },
      data: {
        // Store pause request in metadata or use a flag
        // This is a placeholder - actual implementation depends on workflow engine
        updatedAt: new Date(),
      },
    })

    // Log pause request
    await this.eventRepo.appendEvent({
      runId,
      eventType: 'story.pause_requested',
      payload: {
        storyId,
        userId,
        timestamp: new Date().toISOString(),
      },
      organizationId: (await this.getWorkflowRun(runId)).organizationId,
    })
  }

  /**
   * Skip a story with reason
   */
  async skipStory(runId: string, storyId: string, userId: string, reason: string): Promise<void> {
    // Verify story exists and belongs to this workflow
    const story = await this.databaseService.client.story.findFirst({
      where: {
        id: storyId,
        workflowRunId: runId,
      },
    })

    if (!story) {
      throw new NotFoundException(`Story ${storyId} not found in workflow ${runId}`)
    }

    // Cannot skip if already completed or in progress
    if (['completed', 'in_progress'].includes(story.status)) {
      throw new BadRequestException(`Cannot skip story in ${story.status} state`)
    }

    // Update story status to skipped
    await this.databaseService.client.story.update({
      where: { id: storyId },
      data: {
        status: 'skipped',
        error: `Skipped: ${reason}`,
        updatedAt: new Date(),
      },
    })

    // Log skip action
    await this.eventRepo.appendEvent({
      runId,
      eventType: 'story.skipped',
      payload: {
        storyId,
        userId,
        reason,
        timestamp: new Date().toISOString(),
      },
      organizationId: (await this.getWorkflowRun(runId)).organizationId,
    })
  }

  /**
   * Retry a failed story
   */
  async retryStory(runId: string, storyId: string, userId: string): Promise<void> {
    // Verify story exists and belongs to this workflow
    const story = await this.databaseService.client.story.findFirst({
      where: {
        id: storyId,
        workflowRunId: runId,
      },
    })

    if (!story) {
      throw new NotFoundException(`Story ${storyId} not found in workflow ${runId}`)
    }

    // Can only retry failed stories
    if (story.status !== 'failed') {
      throw new BadRequestException(`Cannot retry story in ${story.status} state. Only failed stories can be retried`)
    }

    // Reset story to queued state
    await this.databaseService.client.story.update({
      where: { id: storyId },
      data: {
        status: 'queued',
        startedAt: null,
        completedAt: null,
        duration: null,
        error: null,
        updatedAt: new Date(),
      },
    })

    // Log retry action
    await this.eventRepo.appendEvent({
      runId,
      eventType: 'story.retry_requested',
      payload: {
        storyId,
        userId,
        timestamp: new Date().toISOString(),
      },
      organizationId: (await this.getWorkflowRun(runId)).organizationId,
    })
  }
}
