import { BaseTenantRepository } from '@vyrak/database'

import type {
  WorkflowPhaseEntity,
  CreateWorkflowPhaseData,
  IWorkflowPhaseRepository,
  UpdateWorkflowPhaseData,
} from '../../domain'
export declare class WorkflowPhasePrismaRepository extends BaseTenantRepository implements IWorkflowPhaseRepository {
  private mapToEntity
  findById(id: string): Promise<WorkflowPhaseEntity | null>
  findByWorkflowId(workflowId: string): Promise<WorkflowPhaseEntity[]>
  create(workflowId: string, data: CreateWorkflowPhaseData): Promise<WorkflowPhaseEntity>
  update(id: string, data: UpdateWorkflowPhaseData): Promise<WorkflowPhaseEntity>
  updateStatus(id: string, status: string): Promise<void>
  delete(id: string): Promise<void>
}
//# sourceMappingURL=workflow-phase-prisma.repository.d.ts.map
