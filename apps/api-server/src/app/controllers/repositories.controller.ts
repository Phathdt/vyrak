import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  GIT_REPOSITORY_SERVICE,
  GitRepositoryListResponse,
  GitRepositoryResponse,
  IGitRepositoryService,
} from '@vyrak/project'

import { AuthGuard } from '../../auth'
import { OrganizationMemberGuard } from '../../guards'

@ApiTags('Repositories')
@Controller('api/organizations/:orgId/projects/:projectId/repositories')
@UseGuards(AuthGuard, OrganizationMemberGuard)
export class RepositoriesController {
  constructor(@Inject(GIT_REPOSITORY_SERVICE) private readonly gitRepositoryService: IGitRepositoryService) {}

  @Get()
  @ApiOperation({ summary: 'List git repositories for a project' })
  @ApiResponse({
    status: 200,
    description: 'Repositories retrieved successfully',
    type: GitRepositoryListResponse,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findAll(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string
  ): Promise<GitRepositoryListResponse> {
    const items = await this.gitRepositoryService.findAllByProject(orgId, projectId)

    return {
      items: items.map((repo): GitRepositoryResponse => ({
        id: repo.id,
        projectId: repo.projectId,
        organizationId: repo.organizationId,
        name: repo.name,
        url: repo.url,
        branch: repo.branch,
        provider: repo.provider,
        status: repo.status,
        createdAt: repo.createdAt.toISOString(),
        updatedAt: repo.updatedAt.toISOString(),
      })),
    }
  }
}
