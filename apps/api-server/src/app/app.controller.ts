import { Controller, Get } from '@nestjs/common'
import { ApiExcludeEndpoint } from '@nestjs/swagger'

import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async ping() {
    return this.appService.ping()
  }

  @Get('healthz')
  @ApiExcludeEndpoint()
  healthz() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }
}
