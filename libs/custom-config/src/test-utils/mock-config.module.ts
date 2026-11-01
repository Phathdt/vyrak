import { DynamicModule, Global, Module } from '@nestjs/common'

import { CONFIG_SERVICE } from '../custom-config.module'
import { createMockConfigService } from './mock-config.factory'

import type { IConfigService } from '../config.interface'

/**
 * Test module that provides mock CustomConfigService for testing.
 * Use this instead of importing CustomConfigModule in tests.
 */
@Global()
@Module({})
export class MockConfigModule {
  static forRoot(mockConfig?: Partial<IConfigService>): DynamicModule {
    const config = createMockConfigService(mockConfig)

    return {
      global: true,
      module: MockConfigModule,
      providers: [
        {
          provide: CONFIG_SERVICE,
          useValue: config,
        },
      ],
      exports: [CONFIG_SERVICE],
    }
  }
}
