import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  ClassifyWorkflowDto,
  ConfirmClassificationDto,
  CreateWorkflowDto,
  IWorkflowService,
  ListWorkflowsQueryDto,
  UpdateWorkflowDto,
  WORKFLOW_SERVICE,
  WorkflowResponse,
} from '@vyrak/workflow'

@ApiTags('Workflows')
@Controller('api/organizations/:orgId/projects/:projectId/workflows')
export class WorkflowsController {
  constructor(@Inject(WORKFLOW_SERVICE) private readonly workflowService: IWorkflowService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
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
      classification: workflow.classification,
      classificationConfirmedAt: workflow.classificationConfirmedAt?.toISOString() || null,
      classificationConfirmedById: workflow.classificationConfirmedById,
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
  @ApiResponse({
    status: 200,
    description: 'Workflows retrieved successfully',
  })
  async findAll(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Query() query: ListWorkflowsQueryDto
  ) {
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

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({
    status: 200,
    description: 'Workflow retrieved successfully',
    type: WorkflowResponse,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async findOne(@Param('orgId') orgId: string, @Param('id') id: string): Promise<WorkflowResponse> {
    const workflow = await this.workflowService.findOne(orgId, id)

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
      classification: workflow.classification,
      classificationConfirmedAt: workflow.classificationConfirmedAt?.toISOString() || null,
      classificationConfirmedById: workflow.classificationConfirmedById,
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
  @ApiResponse({
    status: 200,
    description: 'Workflow updated successfully',
    type: WorkflowResponse,
  })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 400, description: 'Only DRAFT workflows can be updated' })
  async update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto
  ): Promise<WorkflowResponse> {
    const workflow = await this.workflowService.update(orgId, id, updateWorkflowDto)

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
      classification: workflow.classification,
      classificationConfirmedAt: workflow.classificationConfirmedAt?.toISOString() || null,
      classificationConfirmedById: workflow.classificationConfirmedById,
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
  @ApiResponse({ status: 204, description: 'Workflow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 400, description: 'Only DRAFT workflows can be deleted' })
  async remove(@Param('orgId') orgId: string, @Param('id') id: string): Promise<void> {
    await this.workflowService.delete(orgId, id)
  }

  @Post(':id/brainstorm')
  @ApiOperation({ summary: 'Start brainstorming phase' })
  @ApiResponse({ status: 200, description: 'Brainstorming started' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({ status: 400, description: 'Can only start brainstorming from DRAFT status' })
  async startBrainstorming(@Param('orgId') orgId: string, @Param('id') id: string) {
    await this.workflowService.startBrainstorming(orgId, id)

    return { message: 'Brainstorming started successfully' }
  }

  @Post(':id/classify')
  @ApiOperation({ summary: 'Classify workflow using AI' })
  @ApiResponse({ status: 200, description: 'Classification started' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async classify(@Param('orgId') _orgId: string, @Param('id') _id: string, @Body() _body: ClassifyWorkflowDto) {
    // TODO: Implement AI classification logic
    return { message: 'Classification started' }
  }

  @Post(':id/confirm-classification')
  @ApiOperation({ summary: 'Confirm workflow classification' })
  @ApiResponse({ status: 200, description: 'Classification confirmed and workflow activated' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @ApiResponse({
    status: 400,
    description: 'Can only confirm classification from BRAINSTORMING or CLASSIFICATION_PENDING',
  })
  async confirmClassification(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: ConfirmClassificationDto
  ) {
    await this.workflowService.confirmClassification(orgId, id, body.type, 'user-id-placeholder')

    return { message: 'Classification confirmed and workflow activated' }
  }
}
