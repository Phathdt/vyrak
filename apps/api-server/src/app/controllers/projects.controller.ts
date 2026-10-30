import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  CreateProjectDto,
  IProjectService,
  ListProjectsQueryDto,
  PaginatedProjectsResponse,
  PROJECT_SERVICE,
  ProjectResponse,
} from '@vyrak/project'

@ApiTags('Projects')
@Controller('api/organizations/:orgId/projects')
export class ProjectsController {
  constructor(@Inject(PROJECT_SERVICE) private readonly projectService: IProjectService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ProjectResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad request - slug already exists' })
  async create(@Param('orgId') orgId: string, @Body() createProjectDto: CreateProjectDto): Promise<ProjectResponse> {
    const project = await this.projectService.create(orgId, createProjectDto)

    return {
      id: project.id,
      organizationId: project.organizationId,
      name: project.name,
      slug: project.slug,
      description: project.description,
      stats: project.stats,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    }
  }

  @Get()
  @ApiOperation({ summary: 'List projects with pagination, search, and sorting' })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully',
    type: PaginatedProjectsResponse,
  })
  async findAll(
    @Param('orgId') orgId: string,
    @Query() query: ListProjectsQueryDto
  ): Promise<PaginatedProjectsResponse> {
    const result = await this.projectService.findAll(orgId, query)

    return {
      items: result.items.map((project) => ({
        id: project.id,
        organizationId: project.organizationId,
        name: project.name,
        slug: project.slug,
        description: project.description,
        stats: project.stats,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved successfully',
    type: ProjectResponse,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(@Param('orgId') orgId: string, @Param('id') id: string): Promise<ProjectResponse> {
    const project = await this.projectService.findOne(orgId, id)

    return {
      id: project.id,
      organizationId: project.organizationId,
      name: project.name,
      slug: project.slug,
      description: project.description,
      stats: project.stats,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    type: ProjectResponse,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() updateProjectDto: CreateProjectDto
  ): Promise<ProjectResponse> {
    const project = await this.projectService.update(orgId, id, updateProjectDto)

    return {
      id: project.id,
      organizationId: project.organizationId,
      name: project.name,
      slug: project.slug,
      description: project.description,
      stats: project.stats,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete project with active workflow runs' })
  async remove(@Param('orgId') orgId: string, @Param('id') id: string): Promise<void> {
    await this.projectService.delete(orgId, id)
  }
}
