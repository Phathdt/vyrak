import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InsufficientPermissionsError, NotOrganizationMemberError, OrganizationSlugExistsError } from '../../domain'
import { OrganizationService } from './organization.service'

import type { IOrganizationRepository, OrganizationWithRole } from '../../domain'

describe('OrganizationService', () => {
  let service: OrganizationService
  let repository: Record<keyof IOrganizationRepository, ReturnType<typeof vi.fn>>

  const buildOrganization = (overrides: Partial<OrganizationWithRole> = {}): OrganizationWithRole => ({
    id: 'org-1',
    name: 'Acme Inc',
    slug: 'acme-inc',
    logo: null,
    role: 'owner',
    memberCount: 1,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  })

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findAllForUser: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      findBySlug: vi.fn(),
    }

    service = new OrganizationService(repository as unknown as IOrganizationRepository)
  })

  describe('create', () => {
    it('creates the organization when the slug is free', async () => {
      const created = buildOrganization()
      repository.findBySlug.mockResolvedValue(null)
      repository.create.mockResolvedValue(created)

      const result = await service.create('user-1', { name: 'Acme Inc', slug: 'acme-inc' })

      expect(result).toBe(created)
      expect(repository.findBySlug).toHaveBeenCalledWith('acme-inc')
      expect(repository.create).toHaveBeenCalledWith('user-1', { name: 'Acme Inc', slug: 'acme-inc' })
    })

    it('throws OrganizationSlugExistsError and skips creation when the slug is taken', async () => {
      repository.findBySlug.mockResolvedValue({ id: 'existing-org' })

      await expect(service.create('user-1', { name: 'Acme Inc', slug: 'acme-inc' })).rejects.toBeInstanceOf(
        OrganizationSlugExistsError
      )

      expect(repository.create).not.toHaveBeenCalled()
    })

    it('exposes the conflicting slug on the error', async () => {
      repository.findBySlug.mockResolvedValue({ id: 'existing-org' })

      const error = await service.create('user-1', { name: 'Acme Inc', slug: 'acme-inc' }).catch((e) => e)

      expect(error).toBeInstanceOf(OrganizationSlugExistsError)
      expect(error.slug).toBe('acme-inc')
      expect(error.message).toBe('Organization slug already exists: acme-inc')
    })
  })

  describe('findAllForUser', () => {
    it('returns the organizations for the user', async () => {
      const organizations = [buildOrganization(), buildOrganization({ id: 'org-2', role: 'member' })]
      repository.findAllForUser.mockResolvedValue(organizations)

      await expect(service.findAllForUser('user-1')).resolves.toEqual(organizations)
      expect(repository.findAllForUser).toHaveBeenCalledWith('user-1')
    })
  })

  describe('findOne', () => {
    it('returns the organization when the user is a member', async () => {
      const organization = buildOrganization()
      repository.findOne.mockResolvedValue(organization)

      await expect(service.findOne('org-1', 'user-1')).resolves.toBe(organization)
      expect(repository.findOne).toHaveBeenCalledWith('org-1', 'user-1')
    })

    it('throws NotOrganizationMemberError when there is no membership', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.findOne('org-1', 'user-1')).rejects.toBeInstanceOf(NotOrganizationMemberError)
    })
  })

  describe('update', () => {
    it('updates when the caller is an owner', async () => {
      const updated = buildOrganization({ name: 'Acme Corp' })
      repository.findOne.mockResolvedValue(buildOrganization({ role: 'owner' }))
      repository.update.mockResolvedValue(updated)

      await expect(service.update('org-1', 'user-1', { name: 'Acme Corp' })).resolves.toBe(updated)
      expect(repository.update).toHaveBeenCalledWith('org-1', { name: 'Acme Corp' })
    })

    it('updates when the caller is an admin', async () => {
      repository.findOne.mockResolvedValue(buildOrganization({ role: 'admin' }))
      repository.update.mockResolvedValue(buildOrganization())

      await service.update('org-1', 'user-1', { name: 'Acme Corp' })

      expect(repository.update).toHaveBeenCalledWith('org-1', { name: 'Acme Corp' })
    })

    it('throws InsufficientPermissionsError for a plain member and does not update', async () => {
      repository.findOne.mockResolvedValue(buildOrganization({ role: 'member' }))

      await expect(service.update('org-1', 'user-1', { name: 'Acme Corp' })).rejects.toBeInstanceOf(
        InsufficientPermissionsError
      )

      expect(repository.update).not.toHaveBeenCalled()
    })

    it('throws NotOrganizationMemberError for a non-member and does not update', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.update('org-1', 'user-1', { name: 'Acme Corp' })).rejects.toBeInstanceOf(
        NotOrganizationMemberError
      )

      expect(repository.update).not.toHaveBeenCalled()
    })
  })

  describe('verifyMembership', () => {
    it('returns id and role when the role is allowed', async () => {
      repository.findOne.mockResolvedValue(buildOrganization({ role: 'admin' }))

      await expect(service.verifyMembership('org-1', 'user-1', ['owner', 'admin'])).resolves.toEqual({
        id: 'org-1',
        role: 'admin',
      })
    })

    it('throws NotOrganizationMemberError when the user is not a member', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.verifyMembership('org-1', 'user-1', ['owner'])).rejects.toBeInstanceOf(
        NotOrganizationMemberError
      )
    })

    it('throws InsufficientPermissionsError carrying required and actual roles', async () => {
      repository.findOne.mockResolvedValue(buildOrganization({ role: 'member' }))

      const error = await service.verifyMembership('org-1', 'user-1', ['owner']).catch((e) => e)

      expect(error).toBeInstanceOf(InsufficientPermissionsError)
      expect(error.required).toEqual(['owner'])
      expect(error.actual).toBe('member')
    })
  })
})
