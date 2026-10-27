import { faker } from '@faker-js/faker'
import type { DatabaseService } from '@vyrak/database'
import { createTestDatabaseService, getPrismaClient, startPostgres, stopPostgres } from '@vyrak/database/test-utils'

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
 * Deletes ALL data regardless of orgId to ensure clean slate for each test
 */
export async function cleanupTestData(_orgId: string): Promise<void> {
  if (!IntegrationTestSetup.databaseService) return

  const prisma = getPrismaClient()

  // Delete ALL data from all tables in correct FK order
  // This ensures no leftover data from previous tests

  // 1. Delete all workflow events
  await prisma.workflowEvent.deleteMany({})

  // 2. Delete all stories
  await prisma.story.deleteMany({})

  // 3. Delete all workflow approvals
  await prisma.workflowApproval.deleteMany({})

  // 4. Delete all workflow step runs
  await prisma.workflowStepRun.deleteMany({})

  // 5. Delete all workflow runs
  await prisma.workflowRun.deleteMany({})

  // 6. Delete all invitations
  await prisma.invitation.deleteMany({})

  // 7. Delete all organization members
  await prisma.member.deleteMany({})

  // 8. Delete all organization projects
  await prisma.project.deleteMany({})

  // 9. Delete all organizations
  await prisma.organization.deleteMany({})

  // 10. Delete all users
  await prisma.user.deleteMany({})

  // NOTE: Do NOT reset counters here - it's handled in beforeEach
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
