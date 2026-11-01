import { Module } from '@nestjs/common'
import { CONFIG_SERVICE, CustomConfigModule } from '@vyrak/custom-config'

import { DatabaseService } from './database.service'

@Module({
  imports: [CustomConfigModule],
  providers: [
    {
      provide: DatabaseService,
      useFactory: (configService) => {
        return new DatabaseService(configService)
      },
      inject: [CONFIG_SERVICE],
    },
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
