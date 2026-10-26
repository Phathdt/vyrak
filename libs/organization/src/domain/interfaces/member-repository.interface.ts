import type { MemberResponse, UpdateMemberRoleDto } from '../schemas'

export interface IMemberRepository {
  list(organizationId: string): Promise<MemberResponse[]>
  findOne(memberId: string): Promise<(MemberResponse & { organizationId: string }) | null>
  updateRole(memberId: string, role: UpdateMemberRoleDto['role']): Promise<MemberResponse>
  remove(memberId: string): Promise<void>
  findMembership(
    organizationId: string,
    userId: string
  ): Promise<{ id: string; role: string; organizationId: string } | null>
  countOwners(organizationId: string): Promise<number>
}
