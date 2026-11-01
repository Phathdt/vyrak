import { BaseTenantRepository } from '@vyrak/database'

import type { WorkflowDependencyEntity, IWorkflowDependencyRepository } from '../../domain'
export declare class WorkflowDependencyPrismaRepository
  extends BaseTenantRepository
  implements IWorkflowDependencyRepository
{
  private mapToEntity
  findByWorkflowId(workflowId: string): Promise<WorkflowDependencyEntity[]>
  findByDependentItemId(dependentItemId: string): Promise<WorkflowDependencyEntity[]>
  findByDependsOnItemId(dependsOnItemId: string): Promise<WorkflowDependencyEntity[]>
  create(
    workflowId: string,
    dependentItemId: string,
    dependsOnItemId: string,
    type?: 'BLOCKS'
  ): Promise<WorkflowDependencyEntity>
  delete(id: string): Promise<void>
}
//# sourceMappingURL=workflow-dependency-prisma.repository.d.ts.map
