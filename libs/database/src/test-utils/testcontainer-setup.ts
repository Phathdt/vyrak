import { execSync } from 'node:child_process'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { PrismaPg } from '@prisma/adapter-pg'

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
    // Run schema sync to set up database (db:push for schema sync without migrations)
    execSync('prisma db push --skip-validate --config=prisma/prisma.config.ts', {
      stdio: 'pipe',
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: connectionString },
    })
  } catch (error) {
    // If schema sync fails, stop container and rethrow
    await container.stop()
    process.env.DATABASE_URL = originalDatabaseUrl
    throw new Error(`Database schema sync failed: ${error}`)
  }

  // Set DATABASE_URL for Prisma client
  process.env.DATABASE_URL = connectionString

  // Create Prisma client connected to test database with PrismaPg adapter
  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({
    adapter,
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
  const originalUrl = process.env.DATABASE_URL
  process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock'
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const client = new PrismaClient({ adapter })
  if (originalUrl) {
    process.env.DATABASE_URL = originalUrl
  }
  return client
}

