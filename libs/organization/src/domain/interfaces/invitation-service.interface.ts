import type { InvitationResponse, InviteMemberDto } from '../schemas'

export interface IInvitationService {
  invite(organizationId: string, inviterId: string, data: InviteMemberDto): Promise<InvitationResponse>
  accept(invitationId: string, userId: string): Promise<InvitationResponse>
  reject(invitationId: string, userId: string): Promise<void>
  listForOrganization(organizationId: string, userId: string): Promise<InvitationResponse[]>
  listForUserId(userId: string): Promise<InvitationResponse[]>
  listForUser(userEmail: string): Promise<InvitationResponse[]>
}
