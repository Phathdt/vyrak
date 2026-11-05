import { Controller, Get } from '@nestjs/common'

@Controller()
export class AppController {
  @Get('healthz')
  healthz(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }
}
