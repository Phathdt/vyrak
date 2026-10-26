import { Module } from '@nestjs/common'
import { DatabaseModule } from '@vyrak/database'

import { InvitationService } from './application/services/invitation.service'
import { MemberService } from './application/services/member.service'
import { OrganizationService } from './application/services/organization.service'
import {
  INVITATION_REPOSITORY,
  INVITATION_SERVICE,
  MEMBER_REPOSITORY,
  MEMBER_SERVICE,
  ORGANIZATION_REPOSITORY,
  ORGANIZATION_SERVICE,
  USER_REPOSITORY,
} from './infras/di/di'
import { InvitationPrismaRepository } from './infras/repositories/invitation-prisma.repository'
import { MemberPrismaRepository } from './infras/repositories/member-prisma.repository'
import { OrganizationPrismaRepository } from './infras/repositories/organization-prisma.repository'
import { UserPrismaRepository } from './infras/repositories/user-prisma.repository'

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: ORGANIZATION_REPOSITORY,
      useFactory: (prisma) => new OrganizationPrismaRepository(prisma),
      inject: [DatabaseModule],
    },
    {
      provide: ORGANIZATION_SERVICE,
      useFactory: (repository) => new OrganizationService(repository),
      inject: [ORGANIZATION_REPOSITORY],
    },
    {
      provide: MEMBER_REPOSITORY,
      useFactory: (prisma) => new MemberPrismaRepository(prisma),
      inject: [DatabaseModule],
    },
    {
      provide: MEMBER_SERVICE,
      useFactory: (repository) => new MemberService(repository),
      inject: [MEMBER_REPOSITORY],
    },
    {
      provide: USER_REPOSITORY,
      useFactory: (prisma) => new UserPrismaRepository(prisma),
      inject: [DatabaseModule],
    },
    {
      provide: INVITATION_REPOSITORY,
      useFactory: (prisma) => new InvitationPrismaRepository(prisma),
      inject: [DatabaseModule],
    },
    {
      provide: INVITATION_SERVICE,
      useFactory: (invitationRepo, memberRepo, userRepo) =>
        new InvitationService(invitationRepo, memberRepo, userRepo),
      inject: [INVITATION_REPOSITORY, MEMBER_REPOSITORY, USER_REPOSITORY],
    },
  ],
  exports: [ORGANIZATION_SERVICE, MEMBER_SERVICE, INVITATION_SERVICE],
})
export class OrganizationModule {}
