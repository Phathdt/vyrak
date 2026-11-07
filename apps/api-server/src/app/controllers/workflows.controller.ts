import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { EVENT_BUS, EventType, type IEventBus } from '@vyrak/event-bus'
import {
  AdvanceWorkflowPhaseResponseDto,
  ApproveWorkflowPhaseDto,
  CreateWorkflowDto,
  IWorkflowPhaseService,
  IWorkflowService,
  ListWorkflowsQueryDto,
  PaginatedWorkflowsResponse,
  SendBackPhaseDto,
  UpdateWorkflowDto,
  WORKFLOW_PHASE_SERVICE,
  WORKFLOW_SERVICE,
  WorkflowPhaseListResponseDto,
  WorkflowPhaseResponseDto,
  WorkflowResponse,
} from '@vyrak/workflow-core'
import { IWorkflowPhaseOrchestrator, WORKFLOW_PHASE_ORCHESTRATOR } from '@vyrak/workflow-execution'

import { AuthGuard, CurrentUser } from '../../auth'
import { OrganizationMemberGuard } from '../../guards'

// Updated: implementation, code-review, qa are automated
const AUTOMATED_PHASE_KEYS = new Set(['implementation', 'code-review', 'qa'])

@ApiTags('Workflows')
@Controller('api/organizations/:orgId/projects/:projectId/workflows')
@UseGuards(AuthGuard, OrganizationMemberGuard)
export class WorkflowsController {
  constructor(
    @Inject(WORKFLOW_SERVICE) private readonly workflowService: IWorkflowService,
    @Inject(WORKFLOW_PHASE_SERVICE) private readonly workflowPhaseService: IWorkflowPhaseService,
    @Inject(WORKFLOW_PHASE_ORCHESTRATOR) private readonly phaseOrchestrator: IWorkflowPhaseOrchestrator,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiBody({ type: CreateWorkflowDto })
  @ApiResponse({
    status: 201,
    description: 'Workflow created successfully',
    type: WorkflowResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad request - at least one repository required' })
  async create(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Body() createWorkflowDto: CreateWorkflowDto
  ): Promise<WorkflowResponse> {
    const workflow = await this.workflowService.create(orgId, projectId, 'user-id-placeholder', createWorkflowDto)

    return {
      id: workflow.id,
      organizationId: workflow.organizationId,
      projectId: workflow.projectId,
      type: workflow.type,
      status: workflow.status,
      title: workflow.title,
      description: workflow.description,
      currentPhaseKey: workflow.currentPhaseKey,
      definitionSnapshot: workflow.definitionSnapshot,
      createdById: workflow.createdById,
      startedAt: workflow.startedAt?.toISOString() || null,
      completedAt: workflow.completedAt?.toISOString() || null,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
      repositories: workflow.repositories,
    }
  }

  @Get()
  @ApiOperation({ summary: 'List workflows with pagination, search, and filtering' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflows retrieved successfully',
    type: PaginatedWorkflowsResponse,
  })
  async findAll(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Query() query: ListWorkflowsQueryDto
  ): Promise<PaginatedWorkflowsResponse> {
    const result = await this.workflowService.findAll(orgId, projectId, query)

    return {
      items: result.items.map((workflow) => ({
        id: workflow.id,
        organizationId: workflow.organizationId,
        projectId: workflow.projectId,
        type: workflow.type,
        status: workflow.status,
        title: workflow.title,
        description: workflow.description,
        currentPhaseKey: workflow.currentPhaseKey,
        definitionSnapshot: workflow.definitionSnapshot,
        classification: workflow.classification,
        classificationConfirmedAt: workflow.classificationConfirmedAt?.toISOString() || null,
        classificationConfirmedById: workflow.classificationConfirmedById,
        createdById: workflow.createdById,
        startedAt: workflow.startedAt?.toISOString() || null,
        completedAt: workflow.completedAt?.toISOString() || null,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
        repositories: workflow.repositories,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    }
  }

  @Post(':id/phases/:phaseId/approve')
  @ApiOperation({
    summary: 'Approve a phase and publish phase.approved',
    description:
      'Completes the given phase (must be the current phase), advances the workflow, and publishes a phase.approved event so the worker can start the next phase.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiParam({ name: 'phaseId', description: 'Phase ID' })
  @ApiBody({ type: ApproveWorkflowPhaseDto })
  @ApiResponse({ status: 200, type: AdvanceWorkflowPhaseResponseDto })
  async approvePhaseById(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Param('phaseId') phaseId: string,
    @Body() body: ApproveWorkflowPhaseDto,
    @CurrentUser() userId: string
  ): Promise<AdvanceWorkflowPhaseResponseDto> {
    const workflow = await this.workflowService.findById(orgId, id)

    if (!workflow) {
      throw new NotFoundException('Workflow not found')
    }

    const result = await this.workflowPhaseService.approvePhase(id, phaseId, userId, body.note)

    await this.eventBus.publish(EventType.PHASE_APPROVED, {
      type: EventType.PHASE_APPROVED,
      workflowId: id,
      phaseId,
      phaseKey: result.completedPhase.key,
      nextPhaseKey: result.currentPhaseKey,
      metadata: { orgId, projectId },
      timestamp: Date.now(),
    })

    return {
      previousPhaseKey: result.previousPhaseKey,
      currentPhaseKey: result.currentPhaseKey,
      workflowCompleted: result.workflowCompleted,
      phases: this.mapPhaseEntities(result.phases),
    }
  }

  @Post(':id/phases/approve')
  @ApiOperation({
    summary: 'Approve the current phase (human gate)',
    description: 'Confirms the phase is done, completes it, and starts the next phase (or completes the workflow).',
  })
  @ApiBody({ type: ApproveWorkflowPhaseDto })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 200, type: AdvanceWorkflowPhaseResponseDto })
  async approvePhase(
    @Param('orgId') orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') id: string,
    @Body() body: ApproveWorkflowPhaseDto
  ): Promise<AdvanceWorkflowPhaseResponseDto> {
    const workflow = await this.workflowService.findById(orgId, id)

    if (!workflow) {
      throw new NotFoundException('Workflow not found')
    }

    const result = await this.workflowPhaseService.approveCurrentPhase(id, 'user-id-placeholder', body.note)

    if (result.currentPhaseKey && AUTOMATED_PHASE_KEYS.has(result.currentPhaseKey)) {
      await this.phaseOrchestrator.startAutomationForPhase(id, result.currentPhaseKey)
      const refreshed = await this.workflowPhaseService.listByWorkflowId(id)
      return {
        previousPhaseKey: result.previousPhaseKey,
        currentPhaseKey: result.currentPhaseKey,
        workflowCompleted: result.workflowCompleted,
        phases: this.mapPhaseEntities(refreshed),
      }
    }

    return {
      previousPhaseKey: result.previousPhaseKey,
      currentPhaseKey: result.currentPhaseKey,
      workflowCompleted: result.workflowCompleted,
      phases: this.mapPhaseEntities(result.phases),
    }
  }

  @Post(':id/phases/send-back')
  @ApiOperation({
    summary: 'Send workflow back to an earlier phase (Review/QC → Implementation)',
  })
  @ApiBody({ type: SendBackPhaseDto })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 200, type: AdvanceWorkflowPhaseResponseDto })
  async sendBackPhase(
    @Param('orgId') orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') id: string,
    @Body() body: SendBackPhaseDto
  ): Promise<AdvanceWorkflowPhaseResponseDto> {
    const workflow = await this.workflowService.findById(orgId, id)
    if (!workflow) {
      throw new NotFoundException('Workflow not found')
    }

    const result = await this.workflowPhaseService.sendBackToPhase(id, body.targetPhaseKey, body.reason)

    if (AUTOMATED_PHASE_KEYS.has(body.targetPhaseKey)) {
      await this.phaseOrchestrator.startAutomationForPhase(id, body.targetPhaseKey)
      const refreshed = await this.workflowPhaseService.listByWorkflowId(id)
      return {
        previousPhaseKey: result.previousPhaseKey,
        currentPhaseKey: result.currentPhaseKey,
        workflowCompleted: false,
        phases: this.mapPhaseEntities(refreshed),
      }
    }

    return {
      previousPhaseKey: result.previousPhaseKey,
      currentPhaseKey: result.currentPhaseKey,
      workflowCompleted: false,
      phases: this.mapPhaseEntities(result.phases),
    }
  }

  private mapPhaseEntities(
    phases: Awaited<ReturnType<IWorkflowPhaseService['listByWorkflowId']>>
  ): WorkflowPhaseResponseDto[] {
    return phases.map((phase) => {
      const output = (phase.output ?? {}) as Record<string, unknown>
      const execution = (output.execution ?? null) as WorkflowPhaseResponseDto['execution']
      const reviewSummary = typeof output.reviewSummary === 'string' ? output.reviewSummary : undefined
      const commitSha = typeof output.commitSha === 'string' ? output.commitSha : undefined

      return {
        id: phase.id,
        workflowId: phase.workflowId,
        key: phase.key,
        name: phase.name,
        sequence: phase.sequence,
        status: phase.status,
        startedAt: phase.startedAt?.toISOString() ?? null,
        completedAt: phase.completedAt?.toISOString() ?? null,
        execution,
        reviewSummary,
        commitSha,
      }
    })
  }

  @Get(':id/phases')
  @ApiOperation({ summary: 'List workflow phases' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow phases retrieved successfully',
    type: WorkflowPhaseListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async listPhases(
    @Param('orgId') orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') id: string
  ): Promise<WorkflowPhaseListResponseDto> {
    const workflow = await this.workflowService.findById(orgId, id)

    if (!workflow) {
      throw new NotFoundException('Workflow not found')
    }

    const phases = await this.workflowPhaseService.listByWorkflowId(id)

    return {
      items: this.mapPhaseEntities(phases),
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow retrieved successfully',
    type: WorkflowResponse,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async findOne(
    @Param('orgId') orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') id: string
  ): Promise<WorkflowResponse> {
    const workflow = await this.workflowService.findById(orgId, id)

    if (!workflow) {
      throw new NotFoundException('Workflow not found')
    }

    return {
      id: workflow.id,
      organizationId: workflow.organizationId,
      projectId: workflow.projectId,
      type: workflow.type,
      status: workflow.status,
      title: workflow.title,
      description: workflow.description,
      currentPhaseKey: workflow.currentPhaseKey,
      definitionSnapshot: workflow.definitionSnapshot,
      createdById: workflow.createdById,
      startedAt: workflow.startedAt?.toISOString() || null,
      completedAt: workflow.completedAt?.toISOString() || null,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
      repositories: workflow.repositories,
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiBody({ type: UpdateWorkflowDto })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow updated successfully',
    type: WorkflowResponse,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 400, description: 'Only DRAFT workflows can be updated' })
  async update(
    @Param('orgId') orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto
  ): Promise<WorkflowResponse> {
    await this.workflowService.update(orgId, id, updateWorkflowDto)

    const workflow = await this.workflowService.findById(orgId, id)

    if (!workflow) {
      throw new NotFoundException('Workflow not found')
    }

    return {
      id: workflow.id,
      organizationId: workflow.organizationId,
      projectId: workflow.projectId,
      type: workflow.type,
      status: workflow.status,
      title: workflow.title,
      description: workflow.description,
      currentPhaseKey: workflow.currentPhaseKey,
      definitionSnapshot: workflow.definitionSnapshot,
      createdById: workflow.createdById,
      startedAt: workflow.startedAt?.toISOString() || null,
      completedAt: workflow.completedAt?.toISOString() || null,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
      repositories: workflow.repositories,
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 204, description: 'Workflow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 400, description: 'Only DRAFT workflows can be deleted' })
  async remove(
    @Param('orgId') orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') id: string
  ): Promise<void> {
    await this.workflowService.delete(orgId, id)
  }
}
