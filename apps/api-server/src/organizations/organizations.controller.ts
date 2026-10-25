import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AuthGuard } from './auth.guard'
import { CurrentUser } from './decorators'
import {
  CreateOrganizationDto,
  InvitationResponse,
  InviteMemberDto,
  MemberResponse,
  OrganizationResponse,
  UpdateMemberRoleDto,
  UpdateOrganizationDto,
} from './dto'
import { InvitationsService } from './invitations.service'
import { MembersService } from './members.service'
import { OrganizationsService } from './organizations.service'

@ApiTags('organizations')
@Controller('api/organizations')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly membersService: MembersService,
    private readonly invitationsService: InvitationsService
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

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization (owner only)' })
  @ApiResponse({ status: 204 })
  delete(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.organizationsService.delete(id, userId)
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

@ApiTags('invitations')
@Controller('api/invitations')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get('pending')
  @ApiOperation({ summary: 'List user pending invitations' })
  @ApiResponse({ status: 200, type: [InvitationResponse] })
  listUserInvitations(@CurrentUser() userId: string) {
    return this.invitationsService.listForUserId(userId)
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept invitation' })
  @ApiResponse({ status: 200, type: InvitationResponse })
  accept(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.invitationsService.accept(id, userId)
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject invitation' })
  @ApiResponse({ status: 200 })
  async reject(@Param('id') id: string, @CurrentUser() userId: string) {
    await this.invitationsService.reject(id, userId)
    return { success: true }
  }
}
