import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { PrismaPg } from '@prisma/adapter-pg'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'

import pg from 'pg'

import { PrismaClient } from '../generated/prisma/client'

// Find project root by looking for package.json with workspaces
function findProjectRoot(): string {
  let dir = process.cwd()
  while (dir !== '/') {
    const pkgPath = path.join(dir, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(require('fs').readFileSync(pkgPath, 'utf-8'))
      if (pkg.workspaces) {
        return dir
      }
    }
    dir = path.dirname(dir)
  }
  // Fallback to cwd if monorepo root not found
  return process.cwd()
}

const PROJECT_ROOT = findProjectRoot()

/**
 * Global singleton container shared across all test suites.
 * Started once before any tests run, stopped after all tests complete.
 */
let globalContainer: StartedPostgreSqlContainer | null = null
let globalPrisma: PrismaClient | null = null

/**
 * Start the global PostgreSQL Testcontainer.
 * Should be called once before running test suites (in beforeAll of the first test).
 *
 * Pattern inspired by looper: Use a single container shared across all tests,
 * with `singleFork: true` in vitest config to run tests sequentially.
 *
 * @example
 * ```typescript
 * beforeAll(async () => {
 *   await startPostgres()
 * })
 * ```
 */
export async function startPostgres(): Promise<void> {
  if (globalContainer) {
    // Already started
    return
  }

  try {
    console.log('Starting global PostgreSQL Testcontainer...')

    globalContainer = await new PostgreSqlContainer('postgres:17-alpine')
      .withUsername('test')
      .withPassword('test')
      .withDatabase('testdb')
      .start()

    const connectionString = globalContainer.getConnectionUri()
    console.log('PostgreSQL container started:', connectionString)

    // Run migrations using db push (faster than migrate deploy for tests)
    // Use PRISMA_DISABLE_WARNINGS=true to skip AI safety check
    const pushCommand = `PRISMA_DISABLE_WARNINGS=true npx prisma db push --url="${connectionString}"`

    console.log('Running database migrations...')
    execSync(pushCommand, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: connectionString,
      },
    })

    console.log('Database schema synchronized successfully')

    // Create Prisma client
    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)

    globalPrisma = new PrismaClient({
      adapter,
      log: process.env['TEST_LOG_QUERIES'] === 'true' ? ['query', 'error', 'warn'] : ['error'],
    })

    await globalPrisma.$connect()
    console.log('Global Prisma client connected')
  } catch (error) {
    console.error('Failed to start PostgreSQL Testcontainer:', error)
    throw error
  }
}

/**
 * Stop the global PostgreSQL Testcontainer.
 * Should be called once after all test suites complete (in afterAll of the last test).
 *
 * @example
 * ```typescript
 * afterAll(async () => {
 *   await stopPostgres()
 * })
 * ```
 */
export async function stopPostgres(): Promise<void> {
  if (globalPrisma) {
    await globalPrisma.$disconnect()
    globalPrisma = null
  }

  if (globalContainer) {
    console.log('Stopping global PostgreSQL Testcontainer...')
    await globalContainer.stop()
    globalContainer = null
    console.log('PostgreSQL container stopped')
  }
}

/**
 * Get the global Prisma client instance.
 * Must be called after startPostgres().
 *
 * @example
 * ```typescript
 * const prisma = getPrismaClient()
 * ```
 */
export function getPrismaClient(): PrismaClient {
  if (!globalPrisma) {
    throw new Error('Global Prisma client not initialized. Call startPostgres() first.')
  }
  return globalPrisma
}

/**
 * Get the connection string of the global container.
 * Useful for debugging or manual database access.
 */
export function getConnectionString(): string {
  if (!globalContainer) {
    throw new Error('Global container not started. Call startPostgres() first.')
  }
  return globalContainer.getConnectionUri()
}
