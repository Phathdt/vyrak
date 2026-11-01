import { BaseTenantRepository } from '@vyrak/database'

import type { IWorkflowRepositoryRepository, WorkflowRepositoryEntity } from '../../domain'
export declare class WorkflowRepositoryPrismaRepository
  extends BaseTenantRepository
  implements IWorkflowRepositoryRepository
{
  private mapToEntity
  findByWorkflowId(workflowId: string): Promise<WorkflowRepositoryEntity[]>
  create(workflowId: string, repositoryId: string): Promise<WorkflowRepositoryEntity>
  createMany(workflowId: string, repositoryIds: string[]): Promise<void>
  delete(id: string): Promise<void>
  deleteByWorkflowId(workflowId: string): Promise<void>
}
//# sourceMappingURL=workflow-repository-prisma.repository.d.ts.map
