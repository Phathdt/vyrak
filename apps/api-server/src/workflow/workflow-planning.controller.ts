import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { IWorkflowPhaseRepository, WORKFLOW_PHASE_REPOSITORY } from '@vyrak/workflow-core'
import {
  IWorkflowPlanningService,
  PlanningChatRequestDto,
  PlanningChatResponseDto,
  PlanningSessionResponseDto,
  GeneratePRDResponseDto,
  WORKFLOW_PLANNING_SERVICE,
  ITechnicalRefinementService,
  TechnicalRefinementChatRequestDto,
  TechnicalRefinementChatResponseDto,
  TechnicalRefinementSessionResponseDto,
  GenerateArtifactsResponseDto,
  GenerateSubTasksResponseDto,
  TECHNICAL_REFINEMENT_SERVICE,
} from '@vyrak/workflow-planning'

import { AuthGuard } from '../auth'
import { OrganizationMemberGuard } from '../guards'

@ApiTags('Workflows - Planning')
@Controller('api/organizations/:orgId/projects/:projectId/workflows/:id')
@UseGuards(AuthGuard, OrganizationMemberGuard)
export class WorkflowPlanningController {
  constructor(
    @Inject(WORKFLOW_PLANNING_SERVICE) private readonly planningService: IWorkflowPlanningService,
    @Inject(TECHNICAL_REFINEMENT_SERVICE) private readonly technicalRefinementService: ITechnicalRefinementService,
    @Inject(WORKFLOW_PHASE_REPOSITORY) private readonly phaseRepository: IWorkflowPhaseRepository
  ) {}

  @Get('planning/session')
  @ApiOperation({ summary: 'Get technical planning conversation for the Planning phase' })
  @ApiResponse({ status: 200, type: PlanningSessionResponseDto })
  async getPlanningSession(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('id') workflowId: string
  ): Promise<PlanningSessionResponseDto> {
    return this.planningService.getPlanningSession(workflowId, orgId, projectId)
  }

  @Post('planning/chat')
  @ApiOperation({
    summary: 'Discuss technical plan with AI (Planning phase)',
    description: 'Architecture and implementation planning with optional repo file paths and pasted code snippets.',
  })
  @ApiResponse({ status: 200, type: PlanningChatResponseDto })
  async planningChat(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('id') workflowId: string,
    @Body() body: PlanningChatRequestDto
  ): Promise<PlanningChatResponseDto> {
    return this.planningService.chat({
      workflowId,
      organizationId: orgId,
      projectId,
      userMessage: body.userMessage,
      codeSnippets: body.codeSnippets,
      repoPaths: body.repoPaths,
    })
  }

  @Post('planning/generate-prd')
  @ApiOperation({
    summary: 'Generate PRD artifact from planning conversation',
    description:
      'Extracts PRD artifact from conversation history and saves it to storage. Sets status to PENDING_APPROVAL.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 200, type: GeneratePRDResponseDto })
  async generatePRD(@Param('orgId') orgId: string, @Param('id') workflowId: string): Promise<GeneratePRDResponseDto> {
    // Get planning session
    const session = await this.planningService.getPlanningSession(workflowId, orgId, '')

    if (!session.sessionId) {
      throw new Error('No planning session found')
    }

    // Find planning phase
    const phases = await this.phaseRepository.findByWorkflowId(workflowId)
    const planningPhase = phases.find((p) => p.key === 'planning')

    if (!planningPhase) {
      throw new Error('Planning phase not found')
    }

    // Generate artifact
    const artifact = await this.planningService.generatePRDArtifact(workflowId, session.sessionId, planningPhase.id)

    // Request approval
    await artifact // Artifact is already created with DRAFT status by default

    return {
      artifactId: artifact.id,
      key: artifact.key,
      title: artifact.title,
      downloadUrl: `/api/organizations/${orgId}/artifacts/${artifact.id}/download`,
      approvalStatus: artifact.approvalStatus,
    }
  }

  // Technical Refinement endpoints

  @Get('technical-refinement/session')
  @ApiOperation({ summary: 'Get Technical Refinement conversation session' })
  @ApiResponse({ status: 200, type: TechnicalRefinementSessionResponseDto })
  async getTechnicalRefinementSession(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('id') workflowId: string
  ): Promise<TechnicalRefinementSessionResponseDto> {
    return this.technicalRefinementService.getTechnicalRefinementSession(workflowId, orgId, projectId)
  }

  @Post('technical-refinement/chat')
  @ApiOperation({
    summary: 'Chat with Technical Refinement Agent',
    description:
      'Generate ADRs, ARD, and Implementation Plans with repository scouting. Agent has access to PRD from Planning phase.',
  })
  @ApiResponse({ status: 200, type: TechnicalRefinementChatResponseDto })
  async technicalRefinementChat(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('id') workflowId: string,
    @Body() body: TechnicalRefinementChatRequestDto
  ): Promise<TechnicalRefinementChatResponseDto> {
    return this.technicalRefinementService.chatTechnicalRefinement({
      workflowId,
      organizationId: orgId,
      projectId,
      userMessage: body.userMessage,
      codeSnippets: body.codeSnippets,
    })
  }

  @Post('technical-refinement/generate-artifacts')
  @ApiOperation({
    summary: 'Generate technical artifacts (ADR, ARD, Implementation Plan)',
    description: 'Parses conversation history and creates artifacts in DRAFT status.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 200, type: GenerateArtifactsResponseDto })
  async generateTechnicalArtifacts(
    @Param('orgId') orgId: string,
    @Param('id') workflowId: string
  ): Promise<GenerateArtifactsResponseDto> {
    // Get technical refinement session
    const session = await this.technicalRefinementService.getTechnicalRefinementSession(workflowId, orgId, '')

    if (!session.sessionId) {
      throw new Error('No technical refinement session found')
    }

    return this.technicalRefinementService.generateTechnicalArtifacts(workflowId, session.sessionId)
  }

  @Post('technical-refinement/generate-subtasks')
  @ApiOperation({
    summary: 'Generate sub-tasks from Implementation Plan',
    description: 'Parses Implementation Plan artifact and creates sub-tasks with dependencies.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 200, type: GenerateSubTasksResponseDto })
  async generateSubTasks(
    @Param('orgId') orgId: string,
    @Param('id') workflowId: string
  ): Promise<GenerateSubTasksResponseDto> {
    // Get technical refinement session
    const session = await this.technicalRefinementService.getTechnicalRefinementSession(workflowId, orgId, '')

    if (!session.sessionId) {
      throw new Error('No technical refinement session found')
    }

    return this.technicalRefinementService.generateSubTasks(workflowId, session.sessionId)
  }
}
