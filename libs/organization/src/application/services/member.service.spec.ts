import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CannotModifyOwnerError,
  CannotRemoveLastOwnerError,
  InsufficientPermissionsError,
  MemberNotFoundError,
  NotOrganizationMemberError,
} from '../../domain'
import { MemberService } from './member.service'

import type { IMemberRepository, MemberResponse } from '../../domain'

describe('MemberService', () => {
  let service: MemberService
  let repository: Record<keyof IMemberRepository, ReturnType<typeof vi.fn>>

  const ORG_ID = 'org-1'

  const buildMember = (overrides: Partial<MemberResponse & { organizationId: string }> = {}) => ({
    id: 'member-1',
    role: 'member' as MemberResponse['role'],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    user: { id: 'user-2', name: 'Jane', email: 'jane@example.com', image: null },
    organizationId: ORG_ID,
    ...overrides,
  })

  const buildMembership = (role = 'owner') => ({ id: 'membership-1', role, organizationId: ORG_ID })

  beforeEach(() => {
    repository = {
      list: vi.fn(),
      findOne: vi.fn(),
      updateRole: vi.fn(),
      remove: vi.fn(),
      findMembership: vi.fn(),
      countOwners: vi.fn(),
    }

    service = new MemberService(repository as unknown as IMemberRepository)
  })

  describe('list', () => {
    it('returns members when the caller belongs to the organization', async () => {
      const members = [buildMember()]
      repository.findMembership.mockResolvedValue(buildMembership('member'))
      repository.list.mockResolvedValue(members)

      await expect(service.list(ORG_ID, 'user-1')).resolves.toEqual(members)
      expect(repository.list).toHaveBeenCalledWith(ORG_ID)
    })

    it('throws NotOrganizationMemberError when the caller is not a member', async () => {
      repository.findMembership.mockResolvedValue(null)

      await expect(service.list(ORG_ID, 'user-1')).rejects.toBeInstanceOf(NotOrganizationMemberError)
      expect(repository.list).not.toHaveBeenCalled()
    })
  })

  describe('updateRole', () => {
    it('updates the role for an owner actor', async () => {
      const updated = buildMember({ role: 'admin' })
      repository.findMembership.mockResolvedValue(buildMembership('owner'))
      repository.findOne.mockResolvedValue(buildMember())
      repository.updateRole.mockResolvedValue(updated)

      await expect(service.updateRole(ORG_ID, 'member-1', 'user-1', { role: 'admin' })).resolves.toBe(updated)
      expect(repository.updateRole).toHaveBeenCalledWith('member-1', 'admin')
    })

    it('throws MemberNotFoundError when the member does not exist', async () => {
      repository.findMembership.mockResolvedValue(buildMembership('owner'))
      repository.findOne.mockResolvedValue(null)

      await expect(service.updateRole(ORG_ID, 'member-1', 'user-1', { role: 'admin' })).rejects.toBeInstanceOf(
        MemberNotFoundError
      )
      expect(repository.updateRole).not.toHaveBeenCalled()
    })

    it('throws MemberNotFoundError when the member belongs to a different organization', async () => {
      repository.findMembership.mockResolvedValue(buildMembership('owner'))
      repository.findOne.mockResolvedValue(buildMember({ organizationId: 'other-org' }))

      await expect(service.updateRole(ORG_ID, 'member-1', 'user-1', { role: 'admin' })).rejects.toBeInstanceOf(
        MemberNotFoundError
      )
      expect(repository.updateRole).not.toHaveBeenCalled()
    })

    it('throws InsufficientPermissionsError when the actor is a plain member', async () => {
      repository.findMembership.mockResolvedValue(buildMembership('member'))

      await expect(service.updateRole(ORG_ID, 'member-1', 'user-1', { role: 'admin' })).rejects.toBeInstanceOf(
        InsufficientPermissionsError
      )
      expect(repository.findOne).not.toHaveBeenCalled()
    })

    it('throws NotOrganizationMemberError when the actor is not a member', async () => {
      repository.findMembership.mockResolvedValue(null)

      await expect(service.updateRole(ORG_ID, 'member-1', 'user-1', { role: 'admin' })).rejects.toBeInstanceOf(
        NotOrganizationMemberError
      )
    })

    it('prevents an admin from promoting a member to owner', async () => {
      repository.findMembership.mockResolvedValue(buildMembership('admin'))
      repository.findOne.mockResolvedValue(buildMember())

      await expect(service.updateRole(ORG_ID, 'member-1', 'user-1', { role: 'owner' })).rejects.toBeInstanceOf(
        CannotModifyOwnerError
      )
      expect(repository.updateRole).not.toHaveBeenCalled()
    })

    it('prevents an admin from modifying an existing owner', async () => {
      repository.findMembership.mockResolvedValue(buildMembership('admin'))
      repository.findOne.mockResolvedValue(buildMember({ role: 'owner' }))

      await expect(service.updateRole(ORG_ID, 'member-1', 'user-1', { role: 'admin' })).rejects.toBeInstanceOf(
        CannotModifyOwnerError
      )
      expect(repository.updateRole).not.toHaveBeenCalled()
    })

    it('prevents demoting the last owner', async () => {
      repository.findMembership.mockResolvedValue(buildMembership('owner'))
      repository.findOne.mockResolvedValue(buildMember({ role: 'owner' }))
      repository.countOwners.mockResolvedValue(1)

      await expect(service.updateRole(ORG_ID, 'member-1', 'user-1', { role: 'admin' })).rejects.toBeInstanceOf(
        CannotRemoveLastOwnerError
      )
      expect(repository.updateRole).not.toHaveBeenCalled()
    })

    it('demotes an owner when another owner remains', async () => {
      const updated = buildMember({ role: 'admin' })
      repository.findMembership.mockResolvedValue(buildMembership('owner'))
      repository.findOne.mockResolvedValue(buildMember({ role: 'owner' }))
      repository.countOwners.mockResolvedValue(2)
      repository.updateRole.mockResolvedValue(updated)

      await expect(service.updateRole(ORG_ID, 'member-1', 'user-1', { role: 'admin' })).resolves.toBe(updated)
      expect(repository.updateRole).toHaveBeenCalledWith('member-1', 'admin')
    })

    it('does not count owners when the role stays owner', async () => {
      repository.findMembership.mockResolvedValue(buildMembership('owner'))
      repository.findOne.mockResolvedValue(buildMember({ role: 'owner' }))
      repository.updateRole.mockResolvedValue(buildMember({ role: 'owner' }))

      await service.updateRole(ORG_ID, 'member-1', 'user-1', { role: 'owner' })

      expect(repository.countOwners).not.toHaveBeenCalled()
    })
  })

  describe('remove', () => {
    it('removes a member for an admin actor', async () => {
      repository.findMembership.mockResolvedValue(buildMembership('admin'))
      repository.findOne.mockResolvedValue(buildMember())

      await expect(service.remove(ORG_ID, 'member-1', 'user-1')).resolves.toBeUndefined()
      expect(repository.remove).toHaveBeenCalledWith('member-1')
    })

    it('throws MemberNotFoundError when the member is missing', async () => {
      repository.findMembership.mockResolvedValue(buildMembership('owner'))
      repository.findOne.mockResolvedValue(null)

      await expect(service.remove(ORG_ID, 'member-1', 'user-1')).rejects.toBeInstanceOf(MemberNotFoundError)
      expect(repository.remove).not.toHaveBeenCalled()
    })

    it('throws MemberNotFoundError when the member is in another organization', async () => {
      repository.findMembership.mockResolvedValue(buildMembership('owner'))
      repository.findOne.mockResolvedValue(buildMember({ organizationId: 'other-org' }))

      await expect(service.remove(ORG_ID, 'member-1', 'user-1')).rejects.toBeInstanceOf(MemberNotFoundError)
      expect(repository.remove).not.toHaveBeenCalled()
    })

    it('refuses to remove the last owner', async () => {
      repository.findMembership.mockResolvedValue(buildMembership('owner'))
      repository.findOne.mockResolvedValue(buildMember({ role: 'owner' }))
      repository.countOwners.mockResolvedValue(1)

      await expect(service.remove(ORG_ID, 'member-1', 'user-1')).rejects.toBeInstanceOf(CannotRemoveLastOwnerError)
      expect(repository.remove).not.toHaveBeenCalled()
    })

    it('removes an owner when another owner remains', async () => {
      repository.findMembership.mockResolvedValue(buildMembership('owner'))
      repository.findOne.mockResolvedValue(buildMember({ role: 'owner' }))
      repository.countOwners.mockResolvedValue(2)

      await service.remove(ORG_ID, 'member-1', 'user-1')

      expect(repository.remove).toHaveBeenCalledWith('member-1')
    })

    it('throws InsufficientPermissionsError when the actor is a plain member', async () => {
      repository.findMembership.mockResolvedValue(buildMembership('member'))

      await expect(service.remove(ORG_ID, 'member-1', 'user-1')).rejects.toBeInstanceOf(InsufficientPermissionsError)
      expect(repository.remove).not.toHaveBeenCalled()
    })

    it('throws NotOrganizationMemberError when the actor is not a member', async () => {
      repository.findMembership.mockResolvedValue(null)

      await expect(service.remove(ORG_ID, 'member-1', 'user-1')).rejects.toBeInstanceOf(NotOrganizationMemberError)
    })
  })
})
