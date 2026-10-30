import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  CreateOrganizationDto,
  INVITATION_SERVICE,
  InvitationResponse,
  InviteMemberDto,
  MEMBER_SERVICE,
  MemberResponse,
  ORGANIZATION_SERVICE,
  OrganizationResponse,
  UpdateMemberRoleDto,
  UpdateOrganizationDto,
  type IInvitationService,
  type IMemberService,
  type IOrganizationService,
} from '@vyrak/organization'

import { AuthGuard, CurrentUser } from '../../auth'

@ApiTags('organizations')
@Controller('api/organizations')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(
    @Inject(ORGANIZATION_SERVICE) private readonly organizationsService: IOrganizationService,
    @Inject(MEMBER_SERVICE) private readonly membersService: IMemberService,
    @Inject(INVITATION_SERVICE) private readonly invitationsService: IInvitationService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new organization' })
  @ApiResponse({ status: 201, type: OrganizationResponse })
  create(@CurrentUser() userId: string, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(userId, dto)
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations for current user' })
  @ApiResponse({ status: 200, type: [OrganizationResponse] })
  async findAll(@CurrentUser() userId: string) {
    console.log('[OrganizationsController] findAll called with userId:', userId)
    const result = await this.organizationsService.findAllForUser(userId)
    console.log('[OrganizationsController] findAll result:', result)
    return result
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization details' })
  @ApiResponse({ status: 200, type: OrganizationResponse })
  findOne(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.organizationsService.findOne(id, userId)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization (admin/owner only)' })
  @ApiResponse({ status: 200, type: OrganizationResponse })
  update(@Param('id') id: string, @CurrentUser() userId: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.update(id, userId, dto)
  }

  // Member Management Endpoints

  @Get(':id/members')
  @ApiOperation({ summary: 'List organization members' })
  @ApiResponse({ status: 200, type: [MemberResponse] })
  listMembers(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.membersService.list(id, userId)
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: 'Update member role (owner/admin only)' })
  @ApiResponse({ status: 200, type: MemberResponse })
  updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() userId: string,
    @Body() dto: UpdateMemberRoleDto
  ) {
    return this.membersService.updateRole(id, memberId, userId, dto)
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove member (owner/admin only)' })
  @ApiResponse({ status: 200 })
  async removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @CurrentUser() userId: string) {
    await this.membersService.remove(id, memberId, userId)
    return { success: true }
  }

  // Invitation Management Endpoints

  @Post(':id/invitations')
  @ApiOperation({ summary: 'Invite member to organization (admin/owner only)' })
  @ApiResponse({ status: 201, type: InvitationResponse })
  inviteMember(@Param('id') id: string, @CurrentUser() userId: string, @Body() dto: InviteMemberDto) {
    return this.invitationsService.invite(id, userId, dto)
  }

  @Get(':id/invitations')
  @ApiOperation({ summary: 'List pending invitations (admin/owner only)' })
  @ApiResponse({ status: 200, type: [InvitationResponse] })
  listInvitations(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.invitationsService.listForOrganization(id, userId)
  }
}
