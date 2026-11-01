import { BaseTenantRepository } from '@vyrak/database'

import { WorkflowStatus } from '../../domain'

import type {
  CreateWorkflowData,
  IWorkflowRepository,
  UpdateWorkflowData,
  WorkflowEntity,
  WorkflowFilters,
  WorkflowType,
} from '../../domain'
export declare class WorkflowPrismaRepository extends BaseTenantRepository implements IWorkflowRepository {
  private mapToEntity
  findById(id: string): Promise<WorkflowEntity | null>
  findAll(projectId: string, filters: WorkflowFilters): Promise<WorkflowEntity[]>
  count(projectId: string, filters: WorkflowFilters): Promise<number>
  create(projectId: string, createdById: string, data: CreateWorkflowData): Promise<WorkflowEntity>
  update(id: string, data: UpdateWorkflowData): Promise<WorkflowEntity>
  updateStatus(id: string, status: WorkflowStatus): Promise<void>
  updateType(id: string, type: WorkflowType, confirmedById: string): Promise<void>
  updateClassification(id: string, classification: Record<string, unknown>): Promise<void>
  updateDefinitionContext(
    id: string,
    data: {
      currentPhaseKey: string | null
      definitionSnapshot: Record<string, unknown>
    }
  ): Promise<void>
  delete(id: string): Promise<void>
}
//# sourceMappingURL=workflow-prisma.repository.d.ts.map
