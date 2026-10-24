import { Module } from '@nestjs/common'
import { DatabaseModule } from '@vyrak/database'

import { AuthGuard } from './auth.guard'
import { InvitationsService } from './invitations.service'
import { MembersService } from './members.service'
import { InvitationsController, OrganizationsController } from './organizations.controller'
import { OrganizationsService } from './organizations.service'

@Module({
  imports: [DatabaseModule],
  controllers: [OrganizationsController, InvitationsController],
  providers: [OrganizationsService, MembersService, InvitationsService, AuthGuard],
  exports: [OrganizationsService, MembersService, InvitationsService],
})
export class OrganizationsModule {}
