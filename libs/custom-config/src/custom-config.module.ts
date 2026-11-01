import { Global, Module } from '@nestjs/common'

import { CustomConfigService } from './custom-config.service'

/**
 * DI token for IConfigService.
 * Use this symbol for injecting the config service via interface.
 *
 * @example
 * ```typescript
 * import type { IConfigService } from '@vyrak/custom-config'
 * import { CONFIG_SERVICE } from '@vyrak/custom-config'
 *
 * export class WorkflowService {
 *   constructor(
 *     @Inject(CONFIG_SERVICE) private readonly config: IConfigService
 *   ) {}
 * }
 * ```
 */
export const CONFIG_SERVICE = Symbol('IConfigService')

@Global()
@Module({
  providers: [
    {
      provide: CustomConfigService,
      useFactory: () => {
        return new CustomConfigService()
      },
    },
    {
      provide: CONFIG_SERVICE,
      useExisting: CustomConfigService,
    },
  ],
  exports: [CustomConfigService, CONFIG_SERVICE],
})
export class CustomConfigModule {}
