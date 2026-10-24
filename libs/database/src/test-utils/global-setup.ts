import { startPostgres, stopPostgres } from './postgres-setup'

/**
 * Global setup for Vitest.
 * Starts a PostgreSQL Testcontainer that will be reused across all test suites.
 */
export async function setup(): Promise<void> {
  await startPostgres()
}

/**
 * Global teardown for Vitest.
 * Stops the global PostgreSQL Testcontainer.
 */
export async function teardown(): Promise<void> {
  await stopPostgres()
}
