import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  CreateGitRepositoryDto,
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
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
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

  @Post()
  @ApiOperation({ summary: 'Connect GitHub repository to project' })
  @ApiBody({ type: CreateGitRepositoryDto })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 201,
    description: 'Repository connected successfully',
    type: GitRepositoryResponse,
  })
  @ApiResponse({ status: 400, description: 'Invalid repository URL format' })
  @ApiResponse({ status: 403, description: 'GitHub App cannot access this repository' })
  @ApiResponse({ status: 404, description: 'Repository not found on GitHub' })
  @ApiResponse({ status: 409, description: 'Repository already connected to this project' })
  async create(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateGitRepositoryDto
  ): Promise<GitRepositoryResponse> {
    const repo = await this.gitRepositoryService.create(orgId, projectId, dto)

    return {
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
    }
  }

  @Delete(':repoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect repository from project' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'repoId', description: 'Repository ID' })
  @ApiResponse({ status: 204, description: 'Repository disconnected successfully' })
  @ApiResponse({ status: 404, description: 'Repository not found' })
  async delete(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('repoId') repoId: string
  ): Promise<void> {
    await this.gitRepositoryService.delete(orgId, projectId, repoId)
  }
}
