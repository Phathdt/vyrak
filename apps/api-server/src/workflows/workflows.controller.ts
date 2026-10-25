import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  APPROVE_WORKFLOW_USE_CASE,
  CANCEL_WORKFLOW_USE_CASE,
  REJECT_WORKFLOW_USE_CASE,
  START_WORKFLOW_USE_CASE,
  type ApproveWorkflowUseCase,
  type CancelWorkflowUseCase,
  type RejectWorkflowUseCase,
  type StartWorkflowUseCase,
} from '@vyrak/workflow-core'
import { Observable } from 'rxjs'

import {
  ApprovalDecisionDto,
  ArtifactContentDto,
  ArtifactMetadataDto,
  CreateWorkflowRunDto,
  ListEventsQueryDto,
  ListWorkflowRunsDto,
  PaginatedEventsResponseDto,
  PaginatedWorkflowRunsDto,
  StepRunResponseDto,
  WorkflowRunResponseDto,
} from './dto'
import {
  toArtifactContentDto,
  toArtifactMetadataDto,
  toStepRunResponseDto,
  toWorkflowEventResponseDto,
  toWorkflowRunResponseDto,
} from './mappers'
import { EventStreamService } from './services'
import { WorkflowsService } from './workflows.service'

import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { OrganizationMemberGuard } from '../guards/organization-member.guard'
import { CurrentUser } from '../organizations/decorators'

@ApiTags('workflows')
@Controller('api')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly eventStreamService: EventStreamService,
    @Inject(START_WORKFLOW_USE_CASE)
    private readonly startWorkflowUseCase: StartWorkflowUseCase,
    @Inject(APPROVE_WORKFLOW_USE_CASE)
    private readonly approveWorkflowUseCase: ApproveWorkflowUseCase,
    @Inject(REJECT_WORKFLOW_USE_CASE)
    private readonly rejectWorkflowUseCase: RejectWorkflowUseCase,
    @Inject(CANCEL_WORKFLOW_USE_CASE)
    private readonly cancelWorkflowUseCase: CancelWorkflowUseCase
  ) {}

  /**
   * POST /api/projects/:projectId/workflows/runs
   * Create a new workflow run
   */
  @Post('projects/:projectId/workflows/runs')
  @UseGuards(OrganizationMemberGuard)
  @ApiOperation({
    summary: 'Create a new workflow run',
    description: 'Initiates a new workflow execution with the provided requirements and repository settings',
  })
  @ApiResponse({
    status: 201,
    description: 'Workflow run created successfully',
    type: WorkflowRunResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a member of the organization' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async createWorkflowRun(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() userId: string,
    @Body() dto: CreateWorkflowRunDto
  ): Promise<WorkflowRunResponseDto> {
    // Get organizationId from project
    const project = await this.workflowsService.getProject(projectId)

    // Start the workflow using the use case
    const run = await this.startWorkflowUseCase.execute({
      organizationId: project.organizationId,
      projectId,
      workflowKey: 'ai-sdlc-workflow',
      workflowVersion: '1.0.0',
      initiatedByUserId: userId,
      idempotencyKey: dto.idempotencyKey,
      input: {
        requirement: dto.requirement,
        repositoryId: dto.repositoryId,
        branch: dto.branch,
      },
    })

    return toWorkflowRunResponseDto(run)
  }

  /**
   * GET /api/workflows/runs/:runId
   * Get workflow run details by ID
   */
  @Get('workflows/runs/:runId')
  @ApiOperation({
    summary: 'Get workflow run details',
    description: 'Retrieves complete details of a specific workflow run',
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow run details retrieved successfully',
    type: WorkflowRunResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to this workflow run' })
  @ApiResponse({ status: 404, description: 'Workflow run not found' })
  async getWorkflowRun(
    @Param('runId', ParseUUIDPipe) runId: string,
    @CurrentUser() userId: string
  ): Promise<WorkflowRunResponseDto> {
    const run = await this.workflowsService.getWorkflowRun(runId, userId)
    return toWorkflowRunResponseDto(run)
  }

  /**
   * GET /api/workflows/runs
   * List workflow runs with optional filters
   */
  @Get('workflows/runs')
  @ApiOperation({
    summary: 'List workflow runs',
    description: 'Retrieves a paginated list of workflow runs with optional filters by project and status',
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow runs retrieved successfully',
    type: PaginatedWorkflowRunsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listWorkflowRuns(
    @Query() query: ListWorkflowRunsDto,
    @CurrentUser() userId: string
  ): Promise<PaginatedWorkflowRunsDto> {
    return this.workflowsService.listWorkflowRuns(query, userId)
  }

  /**
   * POST /api/workflows/runs/:runId/approve
   * Approve a pending workflow
   */
  @Post('workflows/runs/:runId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a pending workflow',
    description: 'Approves a workflow that is waiting for human approval and resumes execution',
  })
  @ApiResponse({ status: 200, description: 'Workflow approved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid approval state or workflow not in waiting_approval state' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no approval permission' })
  @ApiResponse({ status: 404, description: 'Workflow run not found' })
  @ApiResponse({ status: 409, description: 'Approval already decided or plan has been regenerated' })
  async approveWorkflow(
    @Param('runId', ParseUUIDPipe) runId: string,
    @CurrentUser() userId: string,
    @Body() dto: ApprovalDecisionDto
  ): Promise<{ message: string }> {
    // Get workflow run to extract organizationId and projectId
    const run = await this.workflowsService.getWorkflowRunForApproval(runId, userId)

    await this.approveWorkflowUseCase.execute({
      runId,
      userId,
      organizationId: run.organizationId,
      projectId: run.projectId,
      comment: dto.comment,
    })

    return { message: 'Workflow approved successfully' }
  }

  /**
   * POST /api/workflows/runs/:runId/reject
   * Reject a pending workflow
   */
  @Post('workflows/runs/:runId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a pending workflow',
    description: 'Rejects a workflow that is waiting for human approval and cancels execution',
  })
  @ApiResponse({ status: 200, description: 'Workflow rejected successfully' })
  @ApiResponse({ status: 400, description: 'Invalid rejection state or missing comment' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no approval permission' })
  @ApiResponse({ status: 404, description: 'Workflow run not found' })
  @ApiResponse({ status: 409, description: 'Approval already decided' })
  async rejectWorkflow(
    @Param('runId', ParseUUIDPipe) runId: string,
    @CurrentUser() userId: string,
    @Body() dto: ApprovalDecisionDto
  ): Promise<{ message: string }> {
    // Validate comment is required for rejection
    if (!dto.comment || dto.comment.trim().length === 0) {
      throw new Error('Rejection comment is required')
    }

    // Get workflow run to extract organizationId and projectId
    const run = await this.workflowsService.getWorkflowRunForApproval(runId, userId)

    await this.rejectWorkflowUseCase.execute({
      runId,
      userId,
      organizationId: run.organizationId,
      projectId: run.projectId,
      comment: dto.comment,
    })

    return { message: 'Workflow rejected successfully' }
  }

  /**
   * POST /api/workflows/runs/:runId/cancel
   * Cancel a running workflow
   */
  @Post('workflows/runs/:runId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a running workflow',
    description: 'Cancels an in-progress workflow execution',
  })
  @ApiResponse({ status: 200, description: 'Workflow cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Workflow cannot be cancelled (already in terminal state)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to this workflow' })
  @ApiResponse({ status: 404, description: 'Workflow run not found' })
  async cancelWorkflow(
    @Param('runId', ParseUUIDPipe) runId: string,
    @CurrentUser() userId: string,
    @Body() dto: ApprovalDecisionDto
  ): Promise<{ message: string }> {
    // Get workflow run to extract organizationId and projectId
    const run = await this.workflowsService.getWorkflowRun(runId, userId)

    await this.cancelWorkflowUseCase.execute({
      runId,
      userId,
      organizationId: run.organizationId,
      projectId: run.projectId,
      reason: dto.comment || 'User requested cancellation',
    })

    return { message: 'Workflow cancelled successfully' }
  }

  /**
   * GET /api/workflows/runs/:runId/steps
   * Get workflow step executions
   */
  @Get('workflows/runs/:runId/steps')
  @ApiOperation({
    summary: 'Get workflow run steps',
    description: 'Retrieves all step executions for a workflow run ordered by sequence',
  })
  @ApiResponse({
    status: 200,
    description: 'Step details retrieved successfully',
    type: [StepRunResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to this workflow' })
  @ApiResponse({ status: 404, description: 'Workflow run not found' })
  async getSteps(
    @Param('runId', ParseUUIDPipe) runId: string,
    @CurrentUser() userId: string
  ): Promise<StepRunResponseDto[]> {
    const steps = await this.workflowsService.getSteps(runId, userId)
    return steps.map(toStepRunResponseDto)
  }

  /**
   * GET /api/workflows/runs/:runId/events
   * Get workflow events with pagination
   */
  @Get('workflows/runs/:runId/events')
  @ApiOperation({
    summary: 'Get workflow events',
    description: 'Retrieves paginated event history for a workflow run',
  })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved successfully',
    type: PaginatedEventsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to this workflow' })
  @ApiResponse({ status: 404, description: 'Workflow run not found' })
  async getEvents(
    @Param('runId', ParseUUIDPipe) runId: string,
    @Query() query: ListEventsQueryDto,
    @CurrentUser() userId: string
  ): Promise<PaginatedEventsResponseDto> {
    const { events, total } = await this.workflowsService.getEvents(runId, userId, query.limit, query.offset)

    return {
      items: events.map(toWorkflowEventResponseDto),
      total,
      limit: query.limit,
      offset: query.offset,
    }
  }

  /**
   * GET /api/workflows/runs/:runId/artifacts
   * List workflow artifacts
   */
  @Get('workflows/runs/:runId/artifacts')
  @ApiOperation({
    summary: 'List workflow artifacts',
    description: 'Retrieves metadata for all artifacts generated by a workflow run',
  })
  @ApiResponse({
    status: 200,
    description: 'Artifacts listed successfully',
    type: [ArtifactMetadataDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to this workflow' })
  @ApiResponse({ status: 404, description: 'Workflow run not found' })
  async listArtifacts(
    @Param('runId', ParseUUIDPipe) runId: string,
    @CurrentUser() userId: string
  ): Promise<ArtifactMetadataDto[]> {
    const artifacts = await this.workflowsService.listArtifacts(runId, userId)
    return artifacts.map((artifact) => toArtifactMetadataDto(artifact, runId))
  }

  /**
   * GET /api/workflows/runs/:runId/artifacts/:artifactId
   * Get artifact content
   */
  @Get('workflows/runs/:runId/artifacts/:artifactId')
  @ApiOperation({
    summary: 'Get artifact content',
    description: 'Retrieves the full content of a specific artifact',
  })
  @ApiResponse({
    status: 200,
    description: 'Artifact content retrieved successfully',
    type: ArtifactContentDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to this artifact' })
  @ApiResponse({ status: 404, description: 'Artifact not found' })
  async getArtifact(
    @Param('runId', ParseUUIDPipe) runId: string,
    @Param('artifactId', ParseUUIDPipe) artifactId: string,
    @CurrentUser() userId: string
  ): Promise<ArtifactContentDto> {
    const artifact = await this.workflowsService.getArtifact(runId, artifactId, userId)
    return toArtifactContentDto(artifact, runId)
  }

  /**
   * GET /api/workflows/runs/:runId/events/stream
   * Stream workflow events via SSE
   */
  @Sse('workflows/runs/:runId/events/stream')
  @ApiOperation({
    summary: 'Stream workflow events',
    description: 'Opens SSE connection for real-time workflow event updates',
  })
  @ApiResponse({
    status: 200,
    description: 'SSE stream established',
    headers: {
      'Content-Type': {
        description: 'text/event-stream',
        schema: { type: 'string', example: 'text/event-stream' },
      },
      'Cache-Control': {
        description: 'no-cache',
        schema: { type: 'string', example: 'no-cache' },
      },
      Connection: {
        description: 'keep-alive',
        schema: { type: 'string', example: 'keep-alive' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to this workflow' })
  @ApiResponse({ status: 404, description: 'Workflow run not found' })
  async streamEvents(
    @Param('runId', ParseUUIDPipe) runId: string,
    @CurrentUser() userId: string,
    @Query('since') since?: string
  ): Promise<Observable<MessageEvent>> {
    // Verify access first (synchronous check before opening stream)
    await this.workflowsService.getWorkflowRun(runId, userId)

    // Parse initial sequence number
    const initialSequence = since ? parseInt(since, 10) : 0

    // Return observable stream
    return this.eventStreamService.createEventStream(runId, initialSequence)
  }
}
