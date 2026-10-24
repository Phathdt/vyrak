import { Global, Module } from '@nestjs/common'

import { CustomConfigService } from './custom-config.service'

@Global()
@Module({
  providers: [
    {
      provide: CustomConfigService,
      useFactory: () => {
        return new CustomConfigService()
      },
    },
  ],
  exports: [CustomConfigService],
})
export class CustomConfigModule {}
