import { execSync } from 'node:child_process'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'

import { PrismaClient } from '../generated/prisma/client'

interface TestDatabaseSetup {
  container: StartedPostgreSqlContainer
  prisma: PrismaClient
  cleanup: () => Promise<void>
}

/**
 * Setup a PostgreSQL Testcontainer for integration tests.
 * This creates an isolated database instance, runs migrations, and returns a configured Prisma client.
 *
 * Usage:
 * ```typescript
 * let prisma: PrismaClient
 * let cleanup: () => Promise<void>
 *
 * beforeAll(async () => {
 *   const setup = await setupTestDatabase()
 *   prisma = setup.prisma
 *   cleanup = setup.cleanup
 * })
 *
 * afterAll(async () => {
 *   await cleanup()
 * })
 * ```
 */
export async function setupTestDatabase(): Promise<TestDatabaseSetup> {
  // Start PostgreSQL 16 container
  const container = await new PostgreSqlContainer('postgres:16-alpine').withExposedPorts(5432).start()

  const connectionString = container.getConnectionUri()

  // Set environment variable for Prisma
  const originalDatabaseUrl = process.env.DATABASE_URL
  process.env.DATABASE_URL = connectionString

  try {
    // Run migrations to set up schema
    execSync('yarn db:migrate:deploy', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: connectionString },
    })
  } catch (error) {
    // If migration fails, stop container and rethrow
    await container.stop()
    process.env.DATABASE_URL = originalDatabaseUrl
    throw new Error(`Migration failed: ${error}`)
  }

  // Create Prisma client connected to test database
  const prisma = new PrismaClient({
    datasources: {
      db: { url: connectionString },
    },
    log: process.env.TEST_LOG_QUERIES === 'true' ? ['query', 'error', 'warn'] : ['error'],
  })

  await prisma.$connect()

  const cleanup = async () => {
    await prisma.$disconnect()
    await container.stop()
    // Restore original DATABASE_URL
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl
    } else {
      delete process.env.DATABASE_URL
    }
  }

  return { container, prisma, cleanup }
}

/**
 * Create a fresh Prisma client for tests (without Testcontainer).
 * Use this for unit tests with mocked Prisma client.
 */
export function createMockPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: { url: 'postgresql://mock:mock@localhost:5432/mock' },
    },
  })
}
