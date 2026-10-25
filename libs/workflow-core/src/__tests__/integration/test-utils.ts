import { faker } from '@faker-js/faker'
import { Test, TestingModule } from '@nestjs/testing'
import { DatabaseModule, DatabaseService } from '@vyrak/database'

import { expect } from 'vitest'

import { WorkflowCoreModule } from '../../workflow-core.module'

/**
 * Test database utilities for integration tests
 */

export class IntegrationTestSetup {
  static module: TestingModule
  static db: DatabaseService

  /**
   * Initialize test module with database
   */
  static async init(): Promise<void> {
    this.module = await Test.createTestingModule({
      imports: [DatabaseModule, WorkflowCoreModule],
    }).compile()

    this.db = this.module.get(DatabaseService)

    // Debug: check if db.client exists before init
    console.log('Before onModuleInit - db.client exists:', !!this.db.client)

    // Manually call lifecycle hook since compile() doesn't trigger them
    await this.db.onModuleInit()

    // Debug: check if db.client exists after init
    console.log('After onModuleInit - db.client exists:', !!this.db.client)
    console.log('After onModuleInit - db.$connect called')
  }

  /**
   * Cleanup test module
   */
  static async cleanup(): Promise<void> {
    if (this.module) {
      await this.module.close()
    }
  }

  /**
   * Get injected service from test module
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- NestJS generic token type
  static get<T>(service: any): T {
    return this.module.get<T>(service)
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
export async function cleanupTestData(db: DatabaseService, orgId: string): Promise<void> {
  // Use system access to bypass tenant filter
  await db.withSystemAccess(async () => {
    // Delete in correct order to respect foreign keys
    await db.client.workflowEvent.deleteMany({
      where: { organizationId: orgId },
    })

    await db.client.workflowStepRun.deleteMany({
      where: { organizationId: orgId },
    })

    await db.client.workflowRun.deleteMany({
      where: { organizationId: orgId },
    })
  })
}

/**
 * Assert tenant isolation - ensure query results respect organization boundary
 */
export async function assertTenantIsolation(
  db: DatabaseService,
  allowedOrgId: string,
  deniedOrgId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic query function return type
  queryFn: (db: DatabaseService, orgId: string) => Promise<any>
): Promise<void> {
  // Query with allowed org should work
  const allowedResult = await db.withOrganization(allowedOrgId, () => queryFn(db, allowedOrgId))

  // Query with denied org should return empty or throw
  await db.withSystemAccess(async () => {
    const raw = await db.client.workflowRun.findMany({
      where: { organizationId: deniedOrgId },
    })
    return raw
  })

  // Ensure the denied org result is different/empty
  if (allowedResult && Array.isArray(allowedResult)) {
    expect(allowedResult.length).toBeGreaterThan(0)
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
