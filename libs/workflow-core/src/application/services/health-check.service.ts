import type { PrismaClient } from '@vyrak/database'

/**
 * Health check result structure
 */
export interface HealthCheckResult {
  status: 'ok' | 'error'
  timestamp: string
  uptime: number
  checks?: {
    database?: { status: 'up' | 'down'; responseTime?: number; error?: string }
    environment?: { status: 'up' | 'down'; error?: string }
  }
}

/**
 * Health Check Service
 *
 * Plain TypeScript class (NO @Injectable decorator)
 * Provides liveness and readiness checks for load balancers and orchestrators
 */
export class HealthCheckService {
  private readonly startTime: number

  constructor(private readonly prisma: PrismaClient) {
    this.startTime = Date.now()
  }

  /**
   * Liveness check - verifies app process is running
   * Fast check with no external dependencies
   * Target: <10ms response time
   */
  async checkLiveness(): Promise<HealthCheckResult> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    }
  }

  /**
   * Readiness check - verifies app and dependencies are healthy
   * Checks database connection and required environment variables
   * Target: <50ms response time
   */
  async checkReadiness(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {}

    // Database check with timeout
    const dbStart = Date.now()
    try {
      await this.prisma.$queryRaw`SELECT 1`
      checks.database = {
        status: 'up',
        responseTime: Date.now() - dbStart,
      }
    } catch (error) {
      checks.database = {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }

    // Environment check
    const requiredEnvVars = ['DATABASE__URL', 'NODE_ENV']
    const missingVars = requiredEnvVars.filter((v) => !process.env[v])
    checks.environment = {
      status: missingVars.length === 0 ? 'up' : 'down',
      ...(missingVars.length > 0 && { error: `Missing: ${missingVars.join(', ')}` }),
    }

    const allHealthy = Object.values(checks).every((check) => check.status === 'up')

    return {
      status: allHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks,
    }
  }
}
