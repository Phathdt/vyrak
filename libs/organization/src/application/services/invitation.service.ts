import {
  InsufficientPermissionsError,
  InvalidInvitationError,
  InvitationEmailMismatchError,
  UserAlreadyMemberError,
} from '../../domain'

import type {
  IInvitationRepository,
  IInvitationService,
  IMemberRepository,
  InvitationResponse,
  InviteMemberDto,
} from '../../domain'

interface IUserRepository {
  findByEmail(email: string): Promise<{ id: string; email: string } | null>
  findById(id: string): Promise<{ id: string; email: string } | null>
}

export class InvitationService implements IInvitationService {
  constructor(
    private readonly repository: IInvitationRepository,
    private readonly memberRepository: IMemberRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async invite(organizationId: string, inviterId: string, data: InviteMemberDto): Promise<InvitationResponse> {
    await this.verifyPermission(organizationId, inviterId, ['owner', 'admin'])

    const existingMember = await this.repository.findExistingMember(organizationId, data.email)

    if (existingMember) {
      throw new UserAlreadyMemberError(data.email)
    }

    await this.repository.cancelPending(organizationId, data.email)

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

    return this.repository.create(organizationId, inviterId, data, expiresAt)
  }

  async accept(invitationId: string, userId: string): Promise<InvitationResponse> {
    const invitation = await this.repository.findOne(invitationId)

    if (!invitation || invitation.status !== 'pending') {
      throw new InvalidInvitationError('not_found')
    }

    if (new Date() > invitation.expiresAt) {
      throw new InvalidInvitationError('expired')
    }

    const user = await this.userRepository.findById(userId)

    if (!user || user.email !== invitation.email) {
      throw new InvitationEmailMismatchError(invitation.email, user?.email ?? '')
    }

    await this.repository.createMembership(invitation.organizationId, userId, invitation.role)
    await this.repository.updateStatus(invitationId, 'accepted')

    return {
      ...invitation,
      status: 'accepted',
    }
  }

  async reject(invitationId: string, userId: string): Promise<void> {
    const invitation = await this.repository.findOne(invitationId)

    if (!invitation || invitation.status !== 'pending') {
      throw new InvalidInvitationError('not_found')
    }

    const user = await this.userRepository.findById(userId)

    if (!user || user.email !== invitation.email) {
      throw new InvitationEmailMismatchError(invitation.email, user?.email ?? '')
    }

    await this.repository.updateStatus(invitationId, 'rejected')
  }

  async listForOrganization(organizationId: string, userId: string): Promise<InvitationResponse[]> {
    await this.verifyPermission(organizationId, userId, ['owner', 'admin'])

    return this.repository.listForOrganization(organizationId)
  }

  async listForUserId(userId: string): Promise<InvitationResponse[]> {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      return []
    }

    return this.listForUser(user.email)
  }

  async listForUser(userEmail: string): Promise<InvitationResponse[]> {
    return this.repository.listForUserEmail(userEmail)
  }

  private async verifyPermission(organizationId: string, userId: string, allowedRoles: string[]) {
    const membership = await this.memberRepository.findMembership(organizationId, userId)

    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new InsufficientPermissionsError(allowedRoles, membership?.role ?? null)
    }

    return membership
  }
}
