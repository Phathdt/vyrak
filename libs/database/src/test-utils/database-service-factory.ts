import { AsyncLocalStorage } from 'node:async_hooks'

import { createTenantFilterExtension } from '../extensions'

import type { PrismaClient } from '../generated/prisma/client'

interface TenantFilterContext {
  organizationId?: string
  bypassTenantFilter?: boolean
}

/**
 * Create a minimal DatabaseService for integration testing
 * This provides the same tenant filtering capabilities as the real DatabaseService
 * but without NestJS dependencies
 */
export function createTestDatabaseService(prismaClient: PrismaClient) {
  const asyncLocalStorage = new AsyncLocalStorage<TenantFilterContext>()

  // Extend with tenant filter using AsyncLocalStorage
  const extendedClient = prismaClient.$extends(createTenantFilterExtension(() => asyncLocalStorage.getStore() ?? {}))

  return {
    client: extendedClient,

    /**
     * Get the base Prisma client for raw queries and transactions
     * Mirrors DatabaseService.rawClient
     */
    rawClient: prismaClient,

    /**
     * Expose Prisma $transaction method for use in repositories and tests
     * Mirrors DatabaseService.$transaction
     */
    $transaction: prismaClient.$transaction.bind(prismaClient),

    setTenantContext(organizationId: string): void {
      asyncLocalStorage.enterWith({
        organizationId,
        bypassTenantFilter: false,
      })
    },

    clearTenantContext(): void {
      asyncLocalStorage.enterWith({})
    },

    getTenantContext(): TenantFilterContext {
      return asyncLocalStorage.getStore() ?? {}
    },

    async withOrganization<T>(organizationId: string, fn: () => Promise<T>): Promise<T> {
      return asyncLocalStorage.run({ organizationId, bypassTenantFilter: false }, fn)
    },

    async withTenantContext<T>(organizationId: string, fn: () => Promise<T>): Promise<T> {
      return asyncLocalStorage.run({ organizationId, bypassTenantFilter: false }, fn)
    },

    async withSystemAccess<T>(fn: () => Promise<T>): Promise<T> {
      const currentContext = asyncLocalStorage.getStore() ?? {}
      return asyncLocalStorage.run({ ...currentContext, bypassTenantFilter: true }, fn)
    },
  }
}
