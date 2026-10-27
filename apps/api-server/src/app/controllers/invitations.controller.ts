import { Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { INVITATION_SERVICE, InvitationResponse, type IInvitationService } from '@vyrak/organization'

import { AuthGuard, CurrentUser } from '../../auth'

@ApiTags('invitations')
@Controller('api/invitations')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class InvitationsController {
  constructor(@Inject(INVITATION_SERVICE) private readonly invitationsService: IInvitationService) {}

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
