import { Module } from '@nestjs/common'
import { OrganizationModule, ORGANIZATION_SERVICE } from '@vyrak/organization'

import { UserOnboardingService } from './application'
import { USER_ONBOARDING_SERVICE } from './infras'

@Module({
  imports: [OrganizationModule],
  providers: [
    {
      provide: USER_ONBOARDING_SERVICE,
      useFactory: (organizationService) => {
        return new UserOnboardingService(organizationService)
      },
      inject: [ORGANIZATION_SERVICE],
    },
  ],
  exports: [USER_ONBOARDING_SERVICE],
})
export class UserOnboardingModule {}
