import type { InvitationResponse, InviteMemberDto } from '../schemas'

export interface IInvitationRepository {
  create(
    organizationId: string,
    inviterId: string,
    data: InviteMemberDto,
    expiresAt: Date
  ): Promise<InvitationResponse>
  findOne(id: string): Promise<
    | (InvitationResponse & {
        organizationId: string
        organization: { id: string; name: string; slug: string }
      })
    | null
  >
  updateStatus(id: string, status: 'accepted' | 'rejected'): Promise<void>
  listForOrganization(organizationId: string): Promise<InvitationResponse[]>
  listForUserEmail(email: string): Promise<InvitationResponse[]>
  cancelPending(organizationId: string, email: string): Promise<void>
  findExistingMember(organizationId: string, email: string): Promise<{ id: string } | null>
  createMembership(organizationId: string, userId: string, role: string): Promise<void>
}
