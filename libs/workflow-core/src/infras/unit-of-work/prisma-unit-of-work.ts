import { DatabaseService } from '@vyrak/database'

import type { IUnitOfWork, TransactionContext } from '../../domain/interfaces/unit-of-work.interface'

export class PrismaUnitOfWork implements IUnitOfWork {
  constructor(private readonly database: DatabaseService) {}

  async runInTransaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return await this.database.client.$transaction(async (prismaTransaction) => {
      return await fn(prismaTransaction as TransactionContext)
    })
  }
}
