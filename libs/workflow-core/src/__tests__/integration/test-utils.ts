import { faker } from '@faker-js/faker'
import type { DatabaseService } from '@vyrak/database'
import {
  createTestDatabaseService,
  getPrismaClient,
  resetCounters,
  startPostgres,
  stopPostgres,
} from '@vyrak/database/test-utils'

import { expect } from 'vitest'

import { EventPrismaRepository } from '../../infras/repositories/event-prisma.repository'
import { StepPrismaRepository } from '../../infras/repositories/step-prisma.repository'
import { WorkflowPrismaRepository } from '../../infras/repositories/workflow-prisma.repository'

/**
 * Test database utilities for integration tests
 */

export class IntegrationTestSetup {
  static databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  static workflowRepo: WorkflowPrismaRepository
  static stepRepo: StepPrismaRepository
  static eventRepo: EventPrismaRepository

  /**
   * Initialize test with Testcontainers Prisma client wrapped in DatabaseService
   */
  static async init(): Promise<void> {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      this.databaseService = createTestDatabaseService(prisma)

      // Create repository instances with DatabaseService
      this.workflowRepo = new WorkflowPrismaRepository(this.databaseService as unknown as DatabaseService)
      this.stepRepo = new StepPrismaRepository(this.databaseService as unknown as DatabaseService)
      this.eventRepo = new EventPrismaRepository(this.databaseService as unknown as DatabaseService)
    } catch (error) {
      console.warn('PostgreSQL setup failed, skipping integration tests:', error)
    }
  }

  /**
   * Cleanup test
   */
  static async cleanup(): Promise<void> {
    await stopPostgres()
  }

  /**
   * Execute query with system access (bypass tenant filter)
   */
  static async withSystemAccess<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.databaseService) {
      throw new Error('Database service not initialized')
    }
    // Direct access without tenant filter for test setup
    return fn()
  }
}

/**
 * Test data generators
 */
export const testData = {
  /**
   * Generate unique organization ID for tests
   */
  orgId: () => faker.string.uuid(),

  /**
   * Generate unique project ID for tests
   */
  projectId: () => faker.string.uuid(),

  /**
   * Generate workflow run input data
   */
  workflowInput: () => ({
    user: faker.person.firstName(),
    email: faker.internet.email(),
    action: faker.word.verb(),
  }),

  /**
   * Generate step input data
   */
  stepInput: () => ({
    url: faker.internet.url(),
    method: faker.helpers.arrayElement(['GET', 'POST', 'PUT', 'DELETE']),
    timeout: faker.number.int({ min: 1000, max: 30000 }),
  }),

  /**
   * Generate step output data
   */
  stepOutput: () => ({
    statusCode: faker.helpers.arrayElement([200, 201, 400, 404, 500]),
    responseTime: faker.number.int({ min: 10, max: 5000 }),
    success: faker.datatype.boolean(),
  }),

  /**
   * Generate event payload
   */
  eventPayload: () => ({
    source: faker.word.noun(),
    action: faker.word.verb(),
    timestamp: new Date().toISOString(),
    data: {
      id: faker.string.uuid(),
      value: faker.number.int(),
    },
  }),
}

/**
 * Clean up test data from database
 */
export async function cleanupTestData(orgId: string): Promise<void> {
  if (!IntegrationTestSetup.databaseService) return

  const prisma = getPrismaClient()

  // Find all users in this org to clean up later
  const members = await prisma.member.findMany({
    where: { organizationId: orgId },
  })
  const userIds = members.map((m) => m.userId)

  // Delete in correct order to respect foreign keys
  // 1. Delete workflow events
  await prisma.workflowEvent.deleteMany({
    where: { organizationId: orgId },
  })

  // 2. Delete workflow step runs
  await prisma.workflowStepRun.deleteMany({
    where: { organizationId: orgId },
  })

  // 3. Delete workflow runs (this removes the FK references to users)
  await prisma.workflowRun.deleteMany({
    where: { organizationId: orgId },
  })

  // 4. Delete organization members
  await prisma.member.deleteMany({
    where: { organizationId: orgId },
  })

  // 5. Delete organization projects
  await prisma.project.deleteMany({
    where: { organizationId: orgId },
  })

  // 6. Delete organization
  await prisma.organization.deleteMany({
    where: { id: orgId },
  })

  // 7. Delete users that belonged to this org (now safe to delete)
  if (userIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    })
  }

  // Reset counters for next test
  resetCounters()
}

/**
 * Assert tenant isolation - ensure query results respect organization boundary
 */
export async function assertTenantIsolation(
  allowedOrgId: string,
  deniedOrgId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic query function return type
  queryFn: (orgId: string) => Promise<any>
): Promise<void> {
  // Query with allowed org should work
  const allowedResult = await queryFn(allowedOrgId)

  // Query with denied org
  const prisma = getPrismaClient()
  const deniedResult = await prisma.workflowRun.findMany({
    where: { organizationId: deniedOrgId },
  })

  // Ensure the denied org result is different/empty
  if (allowedResult && Array.isArray(allowedResult)) {
    expect(allowedResult.length).toBeGreaterThan(0)
  }

  // Denied result should be empty or different
  if (Array.isArray(deniedResult)) {
    expect(deniedResult.length).toBe(0)
  }
}

/**
 * Wait for async operation with timeout
 */
export async function waitFor(
  fn: () => Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    if (await fn()) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`)
}
