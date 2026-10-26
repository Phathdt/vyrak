import { BadRequestException, ForbiddenException } from '@nestjs/common'

import type { IMemberRepository } from '../../domain/interfaces/member-repository.interface'
import type { IMemberService } from '../../domain/interfaces/member-service.interface'
import type { MemberResponse, UpdateMemberRoleDto } from '../../domain/schemas'

export class MemberService implements IMemberService {
  constructor(private readonly repository: IMemberRepository) {}

  async list(organizationId: string, userId: string): Promise<MemberResponse[]> {
    await this.verifyMembership(organizationId, userId)

    return this.repository.list(organizationId)
  }

  async updateRole(
    organizationId: string,
    memberId: string,
    actorId: string,
    data: UpdateMemberRoleDto
  ): Promise<MemberResponse> {
    const actor = await this.verifyPermission(organizationId, actorId, ['owner', 'admin'])

    const member = await this.repository.findOne(memberId)

    if (!member || member.organizationId !== organizationId) {
      throw new BadRequestException('Member not found')
    }

    if (actor.role === 'admin' && (data.role === 'owner' || member.role === 'owner')) {
      throw new ForbiddenException('Admins cannot modify owner roles')
    }

    if (member.role === 'owner' && data.role !== 'owner') {
      const ownerCount = await this.repository.countOwners(organizationId)

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot demote last owner')
      }
    }

    return this.repository.updateRole(memberId, data.role)
  }

  async remove(organizationId: string, memberId: string, actorId: string): Promise<void> {
    await this.verifyPermission(organizationId, actorId, ['owner', 'admin'])

    const member = await this.repository.findOne(memberId)

    if (!member || member.organizationId !== organizationId) {
      throw new BadRequestException('Member not found')
    }

    if (member.role === 'owner') {
      const ownerCount = await this.repository.countOwners(organizationId)

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove last owner')
      }
    }

    await this.repository.remove(memberId)
  }

  private async verifyMembership(organizationId: string, userId: string) {
    const membership = await this.repository.findMembership(organizationId, userId)

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization')
    }

    return membership
  }

  private async verifyPermission(organizationId: string, userId: string, allowedRoles: string[]) {
    const membership = await this.verifyMembership(organizationId, userId)

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions')
    }

    return membership
  }
}
