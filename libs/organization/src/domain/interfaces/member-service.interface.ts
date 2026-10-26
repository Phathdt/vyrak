import type { MemberResponse, UpdateMemberRoleDto } from '../schemas'

export interface IMemberService {
  list(organizationId: string, userId: string): Promise<MemberResponse[]>
  updateRole(
    organizationId: string,
    memberId: string,
    actorId: string,
    data: UpdateMemberRoleDto
  ): Promise<MemberResponse>
  remove(organizationId: string, memberId: string, actorId: string): Promise<void>
}
