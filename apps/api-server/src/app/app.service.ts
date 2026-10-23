import { Injectable, Logger } from '@nestjs/common'
import { DatabaseService } from '@vyrak/database'

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name)

  constructor(private readonly db: DatabaseService) {}

  async ping(): Promise<{ msg: string; db: boolean }> {
    const [dbHealthy] = await Promise.all([this.db.healthCheck()])
    if (!dbHealthy) {
      this.logger.error('Database health check failed')
    }
    return { msg: 'pong', db: dbHealthy }
  }
}
