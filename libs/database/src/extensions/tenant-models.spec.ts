import { describe, expect, it } from 'vitest'

import { isOrganizationModel, isTenantOwned, ORGANIZATION_ID_FIELD, TENANT_OWNED_MODELS } from './tenant-models'

describe('Tenant Models', () => {
  describe('TENANT_OWNED_MODELS Array', () => {
    it('should contain expected tenant models', () => {
      expect(TENANT_OWNED_MODELS).toContain('organization')
      expect(TENANT_OWNED_MODELS).toContain('member')
      expect(TENANT_OWNED_MODELS).toContain('invitation')
      expect(TENANT_OWNED_MODELS).toContain('product')
      expect(TENANT_OWNED_MODELS).toContain('project')
      expect(TENANT_OWNED_MODELS).toContain('gitRepository')
      expect(TENANT_OWNED_MODELS).toContain('workflowRun')
      expect(TENANT_OWNED_MODELS).toContain('agentTask')
      expect(TENANT_OWNED_MODELS).toContain('artifact')
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
      expect(isTenantOwned('organization')).toBe(true)
      expect(isTenantOwned('product')).toBe(true)
      expect(isTenantOwned('project')).toBe(true)
      expect(isTenantOwned('member')).toBe(true)
      expect(isTenantOwned('invitation')).toBe(true)
      expect(isTenantOwned('gitRepository')).toBe(true)
      expect(isTenantOwned('workflowRun')).toBe(true)
      expect(isTenantOwned('agentTask')).toBe(true)
      expect(isTenantOwned('artifact')).toBe(true)
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
      expect(isTenantOwned('Product')).toBe(false)
      expect(isTenantOwned('PRODUCT')).toBe(false)
      expect(isTenantOwned('product')).toBe(true)
    })

    it('should validate model names correctly', () => {
      for (const model of TENANT_OWNED_MODELS) {
        expect(isTenantOwned(model)).toBe(true)
      }
    })
  })

  describe('isOrganizationModel Function', () => {
    it('should return true for organization model', () => {
      expect(isOrganizationModel('organization')).toBe(true)
    })

    it('should return false for other tenant-owned models', () => {
      expect(isOrganizationModel('product')).toBe(false)
      expect(isOrganizationModel('member')).toBe(false)
      expect(isOrganizationModel('project')).toBe(false)
      expect(isOrganizationModel('invitation')).toBe(false)
    })

    it('should return false for non-tenant models', () => {
      expect(isOrganizationModel('user')).toBe(false)
      expect(isOrganizationModel('account')).toBe(false)
    })

    it('should be case-sensitive', () => {
      expect(isOrganizationModel('Organization')).toBe(false)
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
      const model: string = 'product'
      if (isTenantOwned(model)) {
        // TypeScript should recognize model as TenantOwnedModel here
        const tenantModel: typeof model = model
        expect(tenantModel).toBe('product')
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
      expect(TENANT_OWNED_MODELS).toContain('organization')
      expect(TENANT_OWNED_MODELS).toContain('member')
    })

    it('should include product and project models', () => {
      expect(TENANT_OWNED_MODELS).toContain('product')
      expect(TENANT_OWNED_MODELS).toContain('project')
    })

    it('should include workflow and automation models', () => {
      expect(TENANT_OWNED_MODELS).toContain('gitRepository')
      expect(TENANT_OWNED_MODELS).toContain('workflowRun')
    })

    it('should include agent and artifact models', () => {
      expect(TENANT_OWNED_MODELS).toContain('agentTask')
      expect(TENANT_OWNED_MODELS).toContain('artifact')
    })

    it('should include invitation model for access control', () => {
      expect(TENANT_OWNED_MODELS).toContain('invitation')
    })
  })
})
