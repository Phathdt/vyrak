// PostgreSQL Testcontainer setup
export { getConnectionString, getDatabase, getPrismaClient, startPostgres, stopPostgres } from './postgres-setup'

// Test data factories
export {
  createTestUser,
  createTestOrganization,
  createTestMember,
  createTestOrgWithOwner,
  createTestProject,
  resetCounters,
} from './test-data-factories'

// Database service factory for testing
export { createTestDatabaseService } from './database-service-factory'

// Global setup (for vitest.config.mjs globalSetup)
export { setup, teardown } from './global-setup'
