import type { WorkflowTemplate } from '@vyrak/database'

/**
 * Workflow Template Repository Interface
 *
 * Defines contract for accessing workflow templates
 */
export interface IWorkflowTemplateRepository {
  /**
   * Find all active workflow templates
   */
  findAllActive(): Promise<WorkflowTemplate[]>

  /**
   * Find workflow template by ID
   */
  findById(id: string): Promise<WorkflowTemplate | null>

  /**
   * Find workflow template by unique key
   */
  findByKey(key: string): Promise<WorkflowTemplate | null>

  /**
   * Check if template is active
   */
  isActive(id: string): Promise<boolean>
}
