/**
 * Unit of Work pattern for transactional operations
 */
export interface IUnitOfWork {
  /**
   * Execute operations within a transaction
   */
  runInTransaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T>
}

/**
 * Transaction context (opaque to application layer)
 */
export type TransactionContext = unknown
