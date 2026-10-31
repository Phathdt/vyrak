export const TENANT_OWNED_MODELS = [
  'Organization',
  'Member',
  'Invitation',
  'Product',
  'Project',
  'GitRepository',
  // Workflow models
  'Workflow',
  'WorkflowRepository',
  'WorkflowPhase',
  'WorkflowWorkItem',
  'WorkflowDependency',
  'AgentExecution',
  'WorkflowMessage',
  'Artifact',
  'WorkflowApproval',
  'WorkflowPublish',
  'ExternalIssueMapping',
  'IntegrationConnection',
  'WorkflowEvent',
  // Legacy models (to be removed)
  'WorkflowRun',
  'WorkflowStepRun',
  'AgentTask',
] as const

export type TenantOwnedModel = (typeof TENANT_OWNED_MODELS)[number]

export function isTenantOwned(model: string): model is TenantOwnedModel {
  return TENANT_OWNED_MODELS.includes(model as TenantOwnedModel)
}

/**
 * Organization model uses id as organizationId
 */
export function isOrganizationModel(model: string): boolean {
  return model === 'Organization'
}

/**
 * Models that reference organizationId directly
 */
export const ORGANIZATION_ID_FIELD = 'organizationId'
