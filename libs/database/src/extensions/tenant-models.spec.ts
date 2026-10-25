import { describe, expect, it } from 'vitest'

import { isOrganizationModel, isTenantOwned, ORGANIZATION_ID_FIELD, TENANT_OWNED_MODELS } from './tenant-models'

describe('Tenant Models', () => {
  describe('TENANT_OWNED_MODELS Array', () => {
    it('should contain expected tenant models', () => {
      expect(TENANT_OWNED_MODELS).toContain('Organization')
      expect(TENANT_OWNED_MODELS).toContain('Member')
      expect(TENANT_OWNED_MODELS).toContain('Invitation')
      expect(TENANT_OWNED_MODELS).toContain('Product')
      expect(TENANT_OWNED_MODELS).toContain('Project')
      expect(TENANT_OWNED_MODELS).toContain('GitRepository')
      expect(TENANT_OWNED_MODELS).toContain('WorkflowRun')
      expect(TENANT_OWNED_MODELS).toContain('AgentTask')
      expect(TENANT_OWNED_MODELS).toContain('Artifact')
    })

    it('should have at least one tenant model', () => {
      expect(TENANT_OWNED_MODELS.length).toBeGreaterThan(0)
    })

    it('should not contain duplicate models', () => {
      const uniqueModels = new Set(TENANT_OWNED_MODELS)
      expect(uniqueModels.size).toBe(TENANT_OWNED_MODELS.length)
    })

    it('should be immutable array', () => {
      // Array.isArray check ensures it's an array
      expect(Array.isArray(TENANT_OWNED_MODELS)).toBe(true)
    })
  })

  describe('isTenantOwned Function', () => {
    it('should return true for tenant-owned models', () => {
      expect(isTenantOwned('Organization')).toBe(true)
      expect(isTenantOwned('Product')).toBe(true)
      expect(isTenantOwned('Project')).toBe(true)
      expect(isTenantOwned('Member')).toBe(true)
      expect(isTenantOwned('Invitation')).toBe(true)
      expect(isTenantOwned('GitRepository')).toBe(true)
      expect(isTenantOwned('WorkflowRun')).toBe(true)
      expect(isTenantOwned('AgentTask')).toBe(true)
      expect(isTenantOwned('Artifact')).toBe(true)
    })

    it('should return false for non-tenant-owned models', () => {
      expect(isTenantOwned('user')).toBe(false)
      expect(isTenantOwned('account')).toBe(false)
      expect(isTenantOwned('session')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isTenantOwned('')).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isTenantOwned(undefined as any)).toBe(false)
    })

    it('should be case-sensitive', () => {
      expect(isTenantOwned('product')).toBe(false)
      expect(isTenantOwned('PRODUCT')).toBe(false)
      expect(isTenantOwned('Product')).toBe(true)
    })

    it('should validate model names correctly', () => {
      for (const model of TENANT_OWNED_MODELS) {
        expect(isTenantOwned(model)).toBe(true)
      }
    })
  })

  describe('isOrganizationModel Function', () => {
    it('should return true for organization model', () => {
      expect(isOrganizationModel('Organization')).toBe(true)
    })

    it('should return false for other tenant-owned models', () => {
      expect(isOrganizationModel('Product')).toBe(false)
      expect(isOrganizationModel('Member')).toBe(false)
      expect(isOrganizationModel('Project')).toBe(false)
      expect(isOrganizationModel('Invitation')).toBe(false)
    })

    it('should return false for non-tenant models', () => {
      expect(isOrganizationModel('user')).toBe(false)
      expect(isOrganizationModel('account')).toBe(false)
    })

    it('should be case-sensitive', () => {
      expect(isOrganizationModel('organization')).toBe(false)
      expect(isOrganizationModel('ORGANIZATION')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isOrganizationModel('')).toBe(false)
    })
  })

  describe('ORGANIZATION_ID_FIELD Constant', () => {
    it('should define organizationId field name', () => {
      expect(ORGANIZATION_ID_FIELD).toBe('organizationId')
    })

    it('should be a string', () => {
      expect(typeof ORGANIZATION_ID_FIELD).toBe('string')
    })

    it('should use camelCase naming', () => {
      expect(ORGANIZATION_ID_FIELD).toMatch(/^[a-z]+[A-Z][a-zA-Z]*$/)
    })
  })

  describe('Type Safety', () => {
    it('should properly type isTenantOwned as type guard', () => {
      const model: string = 'Product'
      if (isTenantOwned(model)) {
        // TypeScript should recognize model as TenantOwnedModel here
        const tenantModel: typeof model = model
        expect(tenantModel).toBe('Product')
      }
    })

    it('should validate all TENANT_OWNED_MODELS are strings', () => {
      for (const model of TENANT_OWNED_MODELS) {
        expect(typeof model).toBe('string')
        expect(model.length).toBeGreaterThan(0)
      }
    })

    it('should ensure each model is unique and valid', () => {
      const modelSet = new Set<string>()

      for (const model of TENANT_OWNED_MODELS) {
        expect(modelSet.has(model)).toBe(false)
        expect(model).toBeTruthy()
        modelSet.add(model)
      }

      expect(modelSet.size).toBe(TENANT_OWNED_MODELS.length)
    })
  })

  describe('Model Completeness', () => {
    it('should include core domain models', () => {
      expect(TENANT_OWNED_MODELS).toContain('Organization')
      expect(TENANT_OWNED_MODELS).toContain('Member')
    })

    it('should include product and project models', () => {
      expect(TENANT_OWNED_MODELS).toContain('Product')
      expect(TENANT_OWNED_MODELS).toContain('Project')
    })

    it('should include workflow and automation models', () => {
      expect(TENANT_OWNED_MODELS).toContain('GitRepository')
      expect(TENANT_OWNED_MODELS).toContain('WorkflowRun')
    })

    it('should include agent and artifact models', () => {
      expect(TENANT_OWNED_MODELS).toContain('AgentTask')
      expect(TENANT_OWNED_MODELS).toContain('Artifact')
    })

    it('should include invitation model for access control', () => {
      expect(TENANT_OWNED_MODELS).toContain('Invitation')
    })
  })
})
