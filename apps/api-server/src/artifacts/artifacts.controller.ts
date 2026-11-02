import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  ARTIFACT_SERVICE,
  ArtifactListResponse,
  ArtifactResponse,
  ArtifactWithContentResponse,
  CreateArtifactDto,
  ListArtifactsQueryDto,
} from '@vyrak/artifact'

import { AuthGuard } from '../auth'
import { OrganizationMemberGuard } from '../guards'

import type { ArtifactEntity, IArtifactService } from '@vyrak/artifact'

@ApiTags('Artifacts')
@Controller('api/organizations/:orgId/workflows/:workflowId/artifacts')
@UseGuards(AuthGuard, OrganizationMemberGuard)
export class ArtifactsController {
  constructor(@Inject(ARTIFACT_SERVICE) private readonly artifactService: IArtifactService) {}

  @Get()
  @ApiOperation({ summary: 'List artifacts for a workflow' })
  @ApiParam({ name: 'orgId', description: 'Organization ID', type: String })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID', type: String })
  @ApiResponse({ status: 200, description: 'Artifacts listed successfully', type: ArtifactListResponse })
  @ApiResponse({ status: 403, description: 'Not a member of this organization' })
  async list(
    @Param('workflowId') workflowId: string,
    @Query() query: ListArtifactsQueryDto
  ): Promise<ArtifactListResponse> {
    const artifacts = await this.artifactService.listWorkflowArtifacts(workflowId, {
      type: query.type,
      key: query.key,
    })

    return { items: artifacts.map((artifact) => this.toResponse(artifact)) }
  }

  @Post()
  @ApiOperation({ summary: 'Upload an artifact for a workflow' })
  @ApiParam({ name: 'orgId', description: 'Organization ID', type: String })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID', type: String })
  @ApiResponse({ status: 201, description: 'Artifact uploaded successfully', type: ArtifactResponse })
  @ApiResponse({ status: 400, description: 'Invalid artifact payload' })
  @ApiResponse({ status: 403, description: 'Not a member of this organization' })
  async upload(
    @Param('workflowId') workflowId: string,
    @Body() createArtifactDto: CreateArtifactDto
  ): Promise<ArtifactResponse> {
    const artifact = await this.artifactService.uploadArtifact(
      workflowId,
      createArtifactDto.type,
      createArtifactDto.key,
      createArtifactDto.title,
      createArtifactDto.content,
      {
        phaseId: createArtifactDto.phaseId ?? null,
        agentExecutionId: createArtifactDto.agentExecutionId ?? null,
        fileName: createArtifactDto.fileName ?? null,
        mimeType: createArtifactDto.mimeType ?? null,
      }
    )

    return this.toResponse(artifact)
  }

  @Get(':artifactId')
  @ApiOperation({ summary: 'Get artifact metadata' })
  @ApiParam({ name: 'orgId', description: 'Organization ID', type: String })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID', type: String })
  @ApiParam({ name: 'artifactId', description: 'Artifact ID', type: String })
  @ApiResponse({ status: 200, description: 'Artifact found', type: ArtifactResponse })
  @ApiResponse({ status: 404, description: 'Artifact not found' })
  async findOne(@Param('artifactId') artifactId: string): Promise<ArtifactResponse> {
    const artifact = await this.artifactService.getArtifact(artifactId)

    return this.toResponse(artifact)
  }

  @Get(':artifactId/content')
  @ApiOperation({ summary: 'Get artifact metadata with markdown content' })
  @ApiParam({ name: 'orgId', description: 'Organization ID', type: String })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID', type: String })
  @ApiParam({ name: 'artifactId', description: 'Artifact ID', type: String })
  @ApiResponse({ status: 200, description: 'Artifact content found', type: ArtifactWithContentResponse })
  @ApiResponse({ status: 404, description: 'Artifact not found' })
  async getContent(@Param('artifactId') artifactId: string): Promise<ArtifactWithContentResponse> {
    const { artifact, content } = await this.artifactService.downloadArtifact(artifactId)

    return {
      ...this.toResponse(artifact),
      content,
    }
  }

  private toResponse(artifact: ArtifactEntity): ArtifactResponse {
    return {
      id: artifact.id,
      organizationId: artifact.organizationId,
      workflowId: artifact.workflowId,
      phaseId: artifact.phaseId,
      agentExecutionId: artifact.agentExecutionId,
      key: artifact.key,
      type: artifact.type,
      title: artifact.title,
      fileName: artifact.fileName,
      s3Bucket: artifact.s3Bucket,
      s3Key: artifact.s3Key,
      mimeType: artifact.mimeType,
      contentSize: artifact.contentSize,
      checksum: artifact.checksum,
      version: artifact.version,
      metadata: artifact.metadata,
      createdAt: artifact.createdAt.toISOString(),
      updatedAt: artifact.updatedAt.toISOString(),
    }
  }
}
