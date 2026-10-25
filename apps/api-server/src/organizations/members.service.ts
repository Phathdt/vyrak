import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { DatabaseService, type Member, type User } from '@vyrak/database'

import { MemberResponse, UpdateMemberRoleDto } from './dto'

@Injectable()
export class MembersService {
  constructor(private readonly prisma: DatabaseService) {}

  /**
   * List all members của organization
   */
  async list(organizationId: string, userId: string): Promise<MemberResponse[]> {
    // Verify membership
    await this.verifyMembership(organizationId, userId)

    const members = await this.prisma.client.member.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return members.map((m: Member & { user: User }): MemberResponse => ({
      id: m.id,
      role: m.role,
      createdAt: m.createdAt,
      user: m.user,
    }))
  }

  /**
   * Update member role (owner only)
   */
  async updateRole(
    organizationId: string,
    memberId: string,
    actorId: string,
    data: UpdateMemberRoleDto
  ): Promise<MemberResponse> {
    // Verify actor permission
    const actor = await this.verifyPermission(organizationId, actorId, ['owner', 'admin'])

    // Get target member
    const member = await this.prisma.client.member.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    if (!member || member.organizationId !== organizationId) {
      throw new BadRequestException('Member not found')
    }

    // Prevent role escalation: admin cannot promote to owner
    if (actor.role === 'admin' && (data.role === 'owner' || member.role === 'owner')) {
      throw new ForbiddenException('Admins cannot modify owner roles')
    }

    // Prevent demoting last owner
    if (member.role === 'owner' && data.role !== 'owner') {
      const ownerCount = await this.prisma.client.member.count({
        where: { organizationId, role: 'owner' },
      })

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot demote last owner')
      }
    }

    const updated = await this.prisma.client.member.update({
      where: { id: memberId },
      data: { role: data.role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return {
      id: updated.id,
      role: updated.role,
      createdAt: updated.createdAt,
      user: updated.user,
    }
  }

  /**
   * Remove member (owner/admin only)
   */
  async remove(organizationId: string, memberId: string, actorId: string): Promise<void> {
    // Verify actor permission
    await this.verifyPermission(organizationId, actorId, ['owner', 'admin'])

    const member = await this.prisma.client.member.findUnique({
      where: { id: memberId },
    })

    if (!member || member.organizationId !== organizationId) {
      throw new BadRequestException('Member not found')
    }

    // Prevent removing last owner
    if (member.role === 'owner') {
      const ownerCount = await this.prisma.client.member.count({
        where: { organizationId, role: 'owner' },
      })

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove last owner')
      }
    }

    await this.prisma.client.member.delete({
      where: { id: memberId },
    })
  }

  private async verifyMembership(organizationId: string, userId: string) {
    const membership = await this.prisma.client.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    })

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
