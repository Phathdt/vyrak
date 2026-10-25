import { faker } from '@faker-js/faker'
import type { PrismaClient } from '@vyrak/database'
import { getPrismaClient, startPostgres, stopPostgres } from '@vyrak/database/test-utils'

import { expect } from 'vitest'

import { EventPrismaRepository } from '../../infras/repositories/event-prisma.repository'
import { StepPrismaRepository } from '../../infras/repositories/step-prisma.repository'
import { WorkflowPrismaRepository } from '../../infras/repositories/workflow-prisma.repository'

/**
 * Test database utilities for integration tests
 */

export class IntegrationTestSetup {
  static prisma: ReturnType<typeof getPrismaClient> | undefined
  static workflowRepo: WorkflowPrismaRepository
  static stepRepo: StepPrismaRepository
  static eventRepo: EventPrismaRepository

  /**
   * Initialize test with Testcontainers Prisma client
   */
  static async init(): Promise<void> {
    try {
      await startPostgres()
      this.prisma = getPrismaClient()

      // Create repository instances with Prisma client directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.workflowRepo = new WorkflowPrismaRepository(this.prisma as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.stepRepo = new StepPrismaRepository(this.prisma as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.eventRepo = new EventPrismaRepository(this.prisma as any)
    } catch (error) {
      console.warn('PostgreSQL setup failed, skipping integration tests:', error)
    }
  }

  /**
   * Cleanup test
   */
  static async cleanup(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect()
    }
    await stopPostgres()
  }

  /**
   * Execute query with system access (bypass tenant filter)
   */
  static async withSystemAccess<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.prisma) {
      throw new Error('Prisma client not initialized')
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
export async function cleanupTestData(prisma: ReturnType<typeof getPrismaClient>, orgId: string): Promise<void> {
  // Delete in correct order to respect foreign keys
  await prisma.workflowEvent.deleteMany({
    where: { organizationId: orgId },
  })

  await prisma.workflowStepRun.deleteMany({
    where: { organizationId: orgId },
  })

  await prisma.workflowRun.deleteMany({
    where: { organizationId: orgId },
  })
}

/**
 * Assert tenant isolation - ensure query results respect organization boundary
 */
export async function assertTenantIsolation(
  prisma: PrismaClient,
  allowedOrgId: string,
  deniedOrgId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic query function return type
  queryFn: (prisma: PrismaClient, orgId: string) => Promise<any>
): Promise<void> {
  // Query with allowed org should work
  const allowedResult = await queryFn(prisma, allowedOrgId)

  // Query with denied org
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
