import { Global, Module } from '@nestjs/common'

import { CustomConfigService } from './custom-config.service'

@Global()
@Module({
  providers: [CustomConfigService],
  exports: [CustomConfigService],
})
export class CustomConfigModule {}
