import { Module } from '@nestjs/common'
import { CustomConfigModule, CustomConfigService } from '@vyrak/custom-config'

import { DatabaseService } from './database.service'

@Module({
  imports: [CustomConfigModule],
  providers: [
    {
      provide: DatabaseService,
      useFactory: (configService: CustomConfigService) => {
        return new DatabaseService(configService)
      },
      inject: [CustomConfigService],
    },
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
