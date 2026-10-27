import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../guards/jwt-auth.guard'
import { OrganizationMemberGuard } from '../../guards/organization-member.guard'
import { WorkflowTemplateDto } from '../dto'
import { toWorkflowTemplateDto } from '../mappers'
import { WorkflowsService } from '../workflows.service'

/**
 * Controller for workflow templates
 * Handles template listing and retrieval with organization scoping
 */
@ApiTags('workflows')
@Controller('api/organizations/:orgId/workflows/templates')
@UseGuards(JwtAuthGuard, OrganizationMemberGuard)
@ApiBearerAuth()
export class WorkflowTemplatesController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  /**
   * GET /api/organizations/:orgId/workflows/templates
   * List all active workflow templates
   */
  @Get()
  @ApiOperation({
    summary: 'List workflow templates',
    description: 'Retrieves all active workflow templates available for the organization',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
    type: [WorkflowTemplateDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a member of the organization' })
  async listTemplates(@Param('orgId', ParseUUIDPipe) _orgId: string): Promise<WorkflowTemplateDto[]> {
    const templates = await this.workflowsService.listActiveTemplates()
    return templates.map(toWorkflowTemplateDto)
  }

  /**
   * GET /api/organizations/:orgId/workflows/templates/:templateId
   * Get workflow template details
   */
  @Get(':templateId')
  @ApiOperation({
    summary: 'Get workflow template details',
    description: 'Retrieves detailed information about a specific workflow template',
  })
  @ApiParam({
    name: 'orgId',
    description: 'Organization ID',
    type: String,
    format: 'uuid',
  })
  @ApiParam({
    name: 'templateId',
    description: 'Template ID',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Template details retrieved successfully',
    type: WorkflowTemplateDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a member of the organization' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplate(
    @Param('orgId', ParseUUIDPipe) _orgId: string,
    @Param('templateId', ParseUUIDPipe) templateId: string
  ): Promise<WorkflowTemplateDto> {
    const template = await this.workflowsService.getTemplateById(templateId)
    return toWorkflowTemplateDto(template)
  }
}
