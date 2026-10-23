import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import { CustomConfigService } from '@vyrak/custom-config'

import { Pool } from 'pg'

import { PrismaClient } from './generated/prisma/client'

type QueryType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'

interface PrismaQueryEvent {
  timestamp: Date
  query: string
  params: string
  duration: number
  target: string
  error?: string
}

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  orange: '\x1b[38;5;208m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
}

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name)
  private readonly enableColors: boolean
  private readonly pool: Pool

  constructor(configService: CustomConfigService) {
    // Create pg Pool for health checks (bypassing Prisma adapter)
    const pool = new Pool({
      connectionString: configService.database.url,
      max: 10,
      idleTimeoutMillis: 300000,
      connectionTimeoutMillis: 5000,
    })

    const logLevel = configService.log.level || 'info'
    const prismaLogLevels = DatabaseService.mapLogLevelToPrisma(logLevel)

    // Create driver adapter for Prisma 7
    const adapter = new PrismaPg(pool)

    super({
      adapter,
      log: prismaLogLevels,
    })

    this.pool = pool
    this.enableColors = !configService.log.enableJsonFormat
  }

  /**
   * Maps standard log levels to Prisma-compatible log levels with event emitters
   */
  public static mapLogLevelToPrisma(logLevel: string): { emit: 'event'; level: 'query' | 'info' | 'warn' | 'error' }[] {
    switch (logLevel.toLowerCase()) {
      case 'trace':
      case 'debug':
        return [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'info' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      case 'info':
        return [
          { emit: 'event', level: 'info' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      case 'warn':
        return [
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
      case 'error':
      case 'fatal':
        return [{ emit: 'event', level: 'error' }]
      default:
        return [
          { emit: 'event', level: 'info' },
          { emit: 'event', level: 'warn' },
          { emit: 'event', level: 'error' },
        ]
    }
  }

  async onModuleInit() {
    await this.$connect()

    // Enhanced SQL query logging
    // @ts-expect-error - Prisma $on typing issue with event names
    this.$on('query', (e: PrismaQueryEvent) => {
      const queryType = e.query.split(' ')[0].toUpperCase() as QueryType
      const formattedQuery = this.formatQuery(e.query)
      const parsedParams = this.parseParams(e.params)
      const performanceLevel = this.getPerformanceLevel(e.duration)
      const tableNames = this.extractTableNames(e.query)

      if (this.enableColors) {
        const coloredMessage = `${this.colorizeQueryType(queryType)} ${performanceLevel} ${this.colorizeDuration(e.duration)} - ${this.colorizeSummary(this.summarizeQuery(e.query, tableNames))}`
        const coloredSQL = this.colorizeSQL(formattedQuery, queryType)
        const coloredParams = this.colorizeParams(parsedParams)

        console.log(coloredMessage)
        console.log(`${COLORS.cyan}SQL:${COLORS.reset} ${coloredSQL}`)
        if (parsedParams.length > 0) {
          console.log(`${COLORS.magenta}Params:${COLORS.reset} ${coloredParams}`)
        }
        if (e.error) {
          console.log(`${COLORS.red}Error:${COLORS.reset} ${this.colorizeError(e.error)}`)
        }
      } else {
        this.logger.log({
          message: `[${queryType}] ${performanceLevel} ${e.duration}ms - ${this.summarizeQuery(e.query, tableNames)}`,
          sqlQuery: formattedQuery,
          sqlParams: parsedParams,
          databaseOperation: true,
          errorMessage: e.error,
        })
      }
    })
  }

  async onModuleDestroy() {
    await this.$disconnect()
    await this.pool.end()
  }

  /**
   * Direct pool query for health checks, bypassing Prisma adapter
   */
  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.pool.connect()
      await client.query('SELECT 1')
      client.release()
      return true
    } catch {
      return false
    }
  }

  private formatQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/,\s*/g, ', ')
      .replace(/\(\s*/g, '(')
      .replace(/\s*\)/g, ')')
      .replace(/"/g, '')
      .replace(/`/g, '')
      .replace(/public\./g, '')
      .trim()
  }

  private parseParams(params: string): unknown[] {
    try {
      return params ? JSON.parse(params) : []
    } catch {
      return []
    }
  }

  private getPerformanceLevel(duration: number): string {
    if (duration < 10) return 'FAST'
    if (duration < 100) return 'MEDIUM'
    if (duration < 1000) return 'SLOW'
    return 'CRITICAL'
  }

  private extractTableNames(query: string): string[] {
    const tableRegex = /(?:FROM|JOIN|INTO|UPDATE)\s+(?:"?(\w+)"?\.)??"?(\w+)"?/gi
    const matches: string[] = []
    let match

    while ((match = tableRegex.exec(query)) !== null) {
      const tableName = match[2] || match[1]
      if (tableName && !matches.includes(tableName)) {
        matches.push(tableName)
      }
    }

    return matches
  }

  private summarizeQuery(query: string, tables: string[]): string {
    const queryType = query.split(' ')[0].toUpperCase()
    const tableList = tables.join(', ')

    switch (queryType) {
      case 'SELECT':
        return `Query ${tableList}`
      case 'INSERT':
        return `Insert into ${tableList}`
      case 'UPDATE':
        return `Update ${tableList}`
      case 'DELETE':
        return `Delete from ${tableList}`
      default:
        return `${queryType} on ${tableList}`
    }
  }

  private colorizeQueryType(queryType: string): string {
    const colors = {
      SELECT: COLORS.cyan,
      INSERT: COLORS.green,
      UPDATE: COLORS.yellow,
      DELETE: COLORS.red,
    }
    const color = colors[queryType as keyof typeof colors] || COLORS.white
    return `${color}[${queryType}]${COLORS.reset}`
  }

  private colorizeDuration(duration: number): string {
    return `${COLORS.bright}${duration}ms${COLORS.reset}`
  }

  private colorizeSummary(summary: string): string {
    return `${COLORS.gray}${summary}${COLORS.reset}`
  }

  private colorizeSQL(sql: string, queryType: string): string {
    const queryColors = {
      SELECT: COLORS.green,
      INSERT: COLORS.cyan,
      UPDATE: COLORS.orange,
      DELETE: COLORS.red,
    }

    const color = queryColors[queryType as keyof typeof queryColors] || COLORS.white
    return `${color}${sql}${COLORS.reset}`
  }

  private colorizeParams(params: unknown[]): string {
    if (!Array.isArray(params)) return JSON.stringify(params)

    const colorizedParams = params.map((param) => {
      if (typeof param === 'string') {
        return `${COLORS.magenta}${param}${COLORS.reset}`
      } else if (typeof param === 'number') {
        return `${COLORS.green}${param}${COLORS.reset}`
      } else if (param === null) {
        return `${COLORS.yellow}null${COLORS.reset}`
      }
      return param
    })

    return `[${colorizedParams.join(', ')}]`
  }

  private colorizeError(error: string): string {
    return `${COLORS.red}${error}${COLORS.reset}`
  }
}
