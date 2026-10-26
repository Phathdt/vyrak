import type { DatabaseService, Member, User } from '@vyrak/database'

import type { IMemberRepository } from '../../domain/interfaces/member-repository.interface'
import type { MemberResponse, UpdateMemberRoleDto } from '../../domain/schemas'

export class MemberPrismaRepository implements IMemberRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async list(organizationId: string): Promise<MemberResponse[]> {
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

  async findOne(memberId: string): Promise<(MemberResponse & { organizationId: string }) | null> {
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

    if (!member) {
      return null
    }

    return {
      id: member.id,
      role: member.role,
      createdAt: member.createdAt,
      organizationId: member.organizationId,
      user: member.user,
    }
  }

  async updateRole(memberId: string, role: UpdateMemberRoleDto['role']): Promise<MemberResponse> {
    const updated = await this.prisma.client.member.update({
      where: { id: memberId },
      data: { role },
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

  async remove(memberId: string): Promise<void> {
    await this.prisma.client.member.delete({
      where: { id: memberId },
    })
  }

  async findMembership(
    organizationId: string,
    userId: string
  ): Promise<{ id: string; role: string; organizationId: string } | null> {
    return this.prisma.client.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      select: {
        id: true,
        role: true,
        organizationId: true,
      },
    })
  }

  async countOwners(organizationId: string): Promise<number> {
    return this.prisma.client.member.count({
      where: { organizationId, role: 'owner' },
    })
  }
}
