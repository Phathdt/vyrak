export const TENANT_OWNED_MODELS = [
  'organization',
  'member',
  'invitation',
  'product',
  'project',
  'gitRepository',
  'workflowRun',
  'agentTask',
  'artifact',
] as const

export type TenantOwnedModel = (typeof TENANT_OWNED_MODELS)[number]

export function isTenantOwned(model: string): model is TenantOwnedModel {
  return TENANT_OWNED_MODELS.includes(model as TenantOwnedModel)
}

/**
 * Organization model uses id as organizationId
 */
export function isOrganizationModel(model: string): boolean {
  return model === 'organization'
}

/**
 * Models that reference organizationId directly
 */
export const ORGANIZATION_ID_FIELD = 'organizationId'
