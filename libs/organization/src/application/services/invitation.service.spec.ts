import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  InsufficientPermissionsError,
  InvalidInvitationError,
  InvitationEmailMismatchError,
  UserAlreadyMemberError,
} from '../../domain'
import { InvitationService } from './invitation.service'

import type { IInvitationRepository, IMemberRepository, InvitationResponse } from '../../domain'

type UserRepository = ConstructorParameters<typeof InvitationService>[2]

describe('InvitationService', () => {
  let service: InvitationService
  let repository: Record<keyof IInvitationRepository, ReturnType<typeof vi.fn>>
  let memberRepository: Record<keyof IMemberRepository, ReturnType<typeof vi.fn>>
  let userRepository: Record<keyof UserRepository, ReturnType<typeof vi.fn>>

  const ORG_ID = 'org-1'
  const NOW = new Date('2026-11-01T00:00:00Z')

  const buildInvitation = (
    overrides: Partial<
      InvitationResponse & { organizationId: string; organization: { id: string; name: string; slug: string } }
    > = {}
  ) => ({
    id: 'invitation-1',
    email: 'jane@example.com',
    role: 'member',
    status: 'pending' as InvitationResponse['status'],
    expiresAt: new Date('2026-11-03T00:00:00Z'),
    createdAt: new Date('2026-11-01T00:00:00Z'),
    organization: { id: ORG_ID, name: 'Acme Inc', slug: 'acme-inc' },
    organizationId: ORG_ID,
    ...overrides,
  })

  const buildMembership = (role = 'owner') => ({ id: 'membership-1', role, organizationId: ORG_ID })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)

    repository = {
      create: vi.fn(),
      findOne: vi.fn(),
      updateStatus: vi.fn(),
      listForOrganization: vi.fn(),
      listForUserEmail: vi.fn(),
      cancelPending: vi.fn(),
      findExistingMember: vi.fn(),
      createMembership: vi.fn(),
    }

    memberRepository = {
      list: vi.fn(),
      findOne: vi.fn(),
      updateRole: vi.fn(),
      remove: vi.fn(),
      findMembership: vi.fn(),
      countOwners: vi.fn(),
    }

    userRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
    }

    service = new InvitationService(
      repository as unknown as IInvitationRepository,
      memberRepository as unknown as IMemberRepository,
      userRepository as unknown as UserRepository
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('invite', () => {
    it('creates an invitation with a 48 hour expiry and cancels pending ones first', async () => {
      const invitation = buildInvitation()
      memberRepository.findMembership.mockResolvedValue(buildMembership('owner'))
      repository.findExistingMember.mockResolvedValue(null)
      repository.create.mockResolvedValue(invitation)

      await expect(service.invite(ORG_ID, 'user-1', { email: 'jane@example.com', role: 'member' })).resolves.toBe(
        invitation
      )

      expect(repository.cancelPending).toHaveBeenCalledWith(ORG_ID, 'jane@example.com')
      expect(repository.create).toHaveBeenCalledWith(
        ORG_ID,
        'user-1',
        { email: 'jane@example.com', role: 'member' },
        new Date('2026-11-03T00:00:00Z')
      )
    })

    it('throws UserAlreadyMemberError and does not create when the email is already a member', async () => {
      memberRepository.findMembership.mockResolvedValue(buildMembership('owner'))
      repository.findExistingMember.mockResolvedValue({ id: 'member-1' })

      await expect(
        service.invite(ORG_ID, 'user-1', { email: 'jane@example.com', role: 'member' })
      ).rejects.toBeInstanceOf(UserAlreadyMemberError)

      expect(repository.cancelPending).not.toHaveBeenCalled()
      expect(repository.create).not.toHaveBeenCalled()
    })

    it('throws InsufficientPermissionsError when the inviter is a plain member', async () => {
      memberRepository.findMembership.mockResolvedValue(buildMembership('member'))

      await expect(
        service.invite(ORG_ID, 'user-1', { email: 'jane@example.com', role: 'member' })
      ).rejects.toBeInstanceOf(InsufficientPermissionsError)

      expect(repository.create).not.toHaveBeenCalled()
    })

    it('throws InsufficientPermissionsError when the inviter is not a member', async () => {
      memberRepository.findMembership.mockResolvedValue(null)

      await expect(
        service.invite(ORG_ID, 'user-1', { email: 'jane@example.com', role: 'member' })
      ).rejects.toBeInstanceOf(InsufficientPermissionsError)
    })
  })

  describe('accept', () => {
    it('creates the membership, marks the invitation accepted, and returns it as accepted', async () => {
      const invitation = buildInvitation()
      repository.findOne.mockResolvedValue(invitation)
      userRepository.findById.mockResolvedValue({ id: 'user-2', email: 'jane@example.com' })

      const result = await service.accept('invitation-1', 'user-2')

      expect(result.status).toBe('accepted')
      expect(repository.createMembership).toHaveBeenCalledWith(ORG_ID, 'user-2', 'member')
      expect(repository.updateStatus).toHaveBeenCalledWith('invitation-1', 'accepted')
    })

    it('throws InvalidInvitationError(not_found) when the invitation is missing', async () => {
      repository.findOne.mockResolvedValue(null)

      const error = await service.accept('invitation-1', 'user-2').catch((e) => e)

      expect(error).toBeInstanceOf(InvalidInvitationError)
      expect(error.reason).toBe('not_found')
    })

    it('throws InvalidInvitationError(not_found) when the invitation is not pending', async () => {
      repository.findOne.mockResolvedValue(buildInvitation({ status: 'accepted' }))

      const error = await service.accept('invitation-1', 'user-2').catch((e) => e)

      expect(error).toBeInstanceOf(InvalidInvitationError)
      expect(error.reason).toBe('not_found')
    })

    it('throws InvalidInvitationError(expired) when the invitation has expired', async () => {
      repository.findOne.mockResolvedValue(buildInvitation({ expiresAt: new Date('2026-10-31T00:00:00Z') }))

      const error = await service.accept('invitation-1', 'user-2').catch((e) => e)

      expect(error).toBeInstanceOf(InvalidInvitationError)
      expect(error.reason).toBe('expired')
      expect(repository.createMembership).not.toHaveBeenCalled()
    })

    it('accepts an invitation expiring exactly now', async () => {
      repository.findOne.mockResolvedValue(buildInvitation({ expiresAt: NOW }))
      userRepository.findById.mockResolvedValue({ id: 'user-2', email: 'jane@example.com' })

      await service.accept('invitation-1', 'user-2')

      expect(repository.createMembership).toHaveBeenCalled()
    })

    it('throws InvitationEmailMismatchError when the user does not exist', async () => {
      repository.findOne.mockResolvedValue(buildInvitation())
      userRepository.findById.mockResolvedValue(null)

      const error = await service.accept('invitation-1', 'user-2').catch((e) => e)

      expect(error).toBeInstanceOf(InvitationEmailMismatchError)
      expect(error.expected).toBe('jane@example.com')
      expect(error.actual).toBe('')
      expect(repository.createMembership).not.toHaveBeenCalled()
    })

    it('throws InvitationEmailMismatchError when the email does not match', async () => {
      repository.findOne.mockResolvedValue(buildInvitation())
      userRepository.findById.mockResolvedValue({ id: 'user-2', email: 'other@example.com' })

      const error = await service.accept('invitation-1', 'user-2').catch((e) => e)

      expect(error).toBeInstanceOf(InvitationEmailMismatchError)
      expect(error.actual).toBe('other@example.com')
      expect(repository.updateStatus).not.toHaveBeenCalled()
    })
  })

  describe('reject', () => {
    it('marks the invitation rejected for the matching user', async () => {
      repository.findOne.mockResolvedValue(buildInvitation())
      userRepository.findById.mockResolvedValue({ id: 'user-2', email: 'jane@example.com' })

      await expect(service.reject('invitation-1', 'user-2')).resolves.toBeUndefined()
      expect(repository.updateStatus).toHaveBeenCalledWith('invitation-1', 'rejected')
    })

    it('throws InvalidInvitationError(not_found) when the invitation is missing', async () => {
      repository.findOne.mockResolvedValue(null)

      await expect(service.reject('invitation-1', 'user-2')).rejects.toBeInstanceOf(InvalidInvitationError)
      expect(repository.updateStatus).not.toHaveBeenCalled()
    })

    it('throws InvalidInvitationError(not_found) when the invitation is not pending', async () => {
      repository.findOne.mockResolvedValue(buildInvitation({ status: 'rejected' }))

      await expect(service.reject('invitation-1', 'user-2')).rejects.toBeInstanceOf(InvalidInvitationError)
    })

    it('throws InvitationEmailMismatchError when the user does not exist', async () => {
      repository.findOne.mockResolvedValue(buildInvitation())
      userRepository.findById.mockResolvedValue(null)

      const error = await service.reject('invitation-1', 'user-2').catch((e) => e)

      expect(error).toBeInstanceOf(InvitationEmailMismatchError)
      expect(error.actual).toBe('')
      expect(repository.updateStatus).not.toHaveBeenCalled()
    })

    it('throws InvitationEmailMismatchError when the email does not match', async () => {
      repository.findOne.mockResolvedValue(buildInvitation())
      userRepository.findById.mockResolvedValue({ id: 'user-2', email: 'other@example.com' })

      await expect(service.reject('invitation-1', 'user-2')).rejects.toBeInstanceOf(InvitationEmailMismatchError)
      expect(repository.updateStatus).not.toHaveBeenCalled()
    })
  })

  describe('listForOrganization', () => {
    it('returns invitations for an admin caller', async () => {
      const invitations = [buildInvitation()]
      memberRepository.findMembership.mockResolvedValue(buildMembership('admin'))
      repository.listForOrganization.mockResolvedValue(invitations)

      await expect(service.listForOrganization(ORG_ID, 'user-1')).resolves.toEqual(invitations)
      expect(repository.listForOrganization).toHaveBeenCalledWith(ORG_ID)
    })

    it('throws InsufficientPermissionsError for a plain member caller', async () => {
      memberRepository.findMembership.mockResolvedValue(buildMembership('member'))

      await expect(service.listForOrganization(ORG_ID, 'user-1')).rejects.toBeInstanceOf(InsufficientPermissionsError)
      expect(repository.listForOrganization).not.toHaveBeenCalled()
    })
  })

  describe('listForUserId', () => {
    it('looks up the user then lists invitations by their email', async () => {
      const invitations = [buildInvitation()]
      userRepository.findById.mockResolvedValue({ id: 'user-2', email: 'jane@example.com' })
      repository.listForUserEmail.mockResolvedValue(invitations)

      await expect(service.listForUserId('user-2')).resolves.toEqual(invitations)
      expect(repository.listForUserEmail).toHaveBeenCalledWith('jane@example.com')
    })

    it('returns an empty list when the user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null)

      await expect(service.listForUserId('user-2')).resolves.toEqual([])
      expect(repository.listForUserEmail).not.toHaveBeenCalled()
    })
  })

  describe('listForUser', () => {
    it('delegates to the repository with the email', async () => {
      const invitations = [buildInvitation()]
      repository.listForUserEmail.mockResolvedValue(invitations)

      await expect(service.listForUser('jane@example.com')).resolves.toEqual(invitations)
      expect(repository.listForUserEmail).toHaveBeenCalledWith('jane@example.com')
    })
  })
})
