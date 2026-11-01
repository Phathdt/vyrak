import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  IWorkflowPlanningService,
  PlanningChatRequestDto,
  PlanningChatResponseDto,
  PlanningSessionResponseDto,
  WORKFLOW_PLANNING_SERVICE,
} from '@vyrak/workflow-planning'

import { AuthGuard } from '../auth'
import { OrganizationMemberGuard } from '../guards'

@ApiTags('Workflows - Planning')
@Controller('api/organizations/:orgId/projects/:projectId/workflows/:id')
@UseGuards(AuthGuard, OrganizationMemberGuard)
export class WorkflowPlanningController {
  constructor(@Inject(WORKFLOW_PLANNING_SERVICE) private readonly planningService: IWorkflowPlanningService) {}

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
}
