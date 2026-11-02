import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  ARTIFACT_SERVICE,
  ApproveArtifactDto,
  ArtifactListResponse,
  ArtifactResponse,
  ArtifactWithContentResponse,
  CreateArtifactDto,
  ListArtifactsQueryDto,
  RejectArtifactDto,
  RequestApprovalDto,
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
      approvalStatus: query.approvalStatus,
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

  @Post(':artifactId/request-approval')
  @ApiOperation({ summary: 'Request approval for an artifact' })
  @ApiParam({ name: 'orgId', description: 'Organization ID', type: String })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID', type: String })
  @ApiParam({ name: 'artifactId', description: 'Artifact ID', type: String })
  @ApiResponse({ status: 200, description: 'Approval requested successfully', type: ArtifactResponse })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 404, description: 'Artifact not found' })
  async requestApproval(
    @Param('artifactId') artifactId: string,
    @Body() dto: RequestApprovalDto
  ): Promise<ArtifactResponse> {
    const artifact = await this.artifactService.requestApproval(artifactId, dto.requesterId)

    return this.toResponse(artifact)
  }

  @Post(':artifactId/approve')
  @ApiOperation({ summary: 'Approve an artifact' })
  @ApiParam({ name: 'orgId', description: 'Organization ID', type: String })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID', type: String })
  @ApiParam({ name: 'artifactId', description: 'Artifact ID', type: String })
  @ApiResponse({ status: 200, description: 'Artifact approved successfully', type: ArtifactResponse })
  @ApiResponse({ status: 400, description: 'Artifact not pending approval' })
  @ApiResponse({ status: 404, description: 'Artifact not found' })
  async approve(@Param('artifactId') artifactId: string, @Body() dto: ApproveArtifactDto): Promise<ArtifactResponse> {
    const artifact = await this.artifactService.approve(artifactId, dto.approverId)

    return this.toResponse(artifact)
  }

  @Post(':artifactId/reject')
  @ApiOperation({ summary: 'Reject an artifact' })
  @ApiParam({ name: 'orgId', description: 'Organization ID', type: String })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID', type: String })
  @ApiParam({ name: 'artifactId', description: 'Artifact ID', type: String })
  @ApiResponse({ status: 200, description: 'Artifact rejected successfully', type: ArtifactResponse })
  @ApiResponse({ status: 400, description: 'Artifact not pending approval' })
  @ApiResponse({ status: 404, description: 'Artifact not found' })
  async reject(@Param('artifactId') artifactId: string, @Body() dto: RejectArtifactDto): Promise<ArtifactResponse> {
    const artifact = await this.artifactService.reject(artifactId, dto.rejectorId, dto.reason)

    return this.toResponse(artifact)
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
      approvalStatus: artifact.approvalStatus,
      approvedById: artifact.approvedById,
      approvedAt: artifact.approvedAt ? artifact.approvedAt.toISOString() : null,
      rejectionReason: artifact.rejectionReason,
      supersededBy: artifact.supersededBy,
      createdAt: artifact.createdAt.toISOString(),
      updatedAt: artifact.updatedAt.toISOString(),
    }
  }
}
