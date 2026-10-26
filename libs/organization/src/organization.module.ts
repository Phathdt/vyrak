import { Module } from '@nestjs/common'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { InvitationService, MemberService, OrganizationService } from './application'
import {
  INVITATION_REPOSITORY,
  INVITATION_SERVICE,
  InvitationPrismaRepository,
  MEMBER_REPOSITORY,
  MEMBER_SERVICE,
  MemberPrismaRepository,
  ORGANIZATION_REPOSITORY,
  ORGANIZATION_SERVICE,
  OrganizationPrismaRepository,
  USER_REPOSITORY,
  UserPrismaRepository,
} from './infras'

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: ORGANIZATION_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new OrganizationPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: ORGANIZATION_SERVICE,
      useFactory: (repository) => new OrganizationService(repository),
      inject: [ORGANIZATION_REPOSITORY],
    },
    {
      provide: MEMBER_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new MemberPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: MEMBER_SERVICE,
      useFactory: (repository) => new MemberService(repository),
      inject: [MEMBER_REPOSITORY],
    },
    {
      provide: USER_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new UserPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: INVITATION_REPOSITORY,
      useFactory: (prisma: DatabaseService) => new InvitationPrismaRepository(prisma),
      inject: [DatabaseService],
    },
    {
      provide: INVITATION_SERVICE,
      useFactory: (invitationRepo, memberRepo, userRepo) => new InvitationService(invitationRepo, memberRepo, userRepo),
      inject: [INVITATION_REPOSITORY, MEMBER_REPOSITORY, USER_REPOSITORY],
    },
  ],
  exports: [ORGANIZATION_SERVICE, MEMBER_SERVICE, INVITATION_SERVICE],
})
export class OrganizationModule {}
