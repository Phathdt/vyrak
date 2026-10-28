import type { IMemberRepository, MemberResponse, UpdateMemberRoleDto } from '../../domain'
import type { DatabaseService } from '@vyrak/database'

export class MemberPrismaRepository implements IMemberRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async list(organizationId: string): Promise<MemberResponse[]> {
    return this.prisma.withSystemAccess(async () => {
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

      return members.map((m): MemberResponse => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt,
        user: m.user,
      }))
    })
  }

  async findOne(memberId: string): Promise<(MemberResponse & { organizationId: string }) | null> {
    return this.prisma.withSystemAccess(async () => {
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
    })
  }

  async updateRole(memberId: string, role: UpdateMemberRoleDto['role']): Promise<MemberResponse> {
    return this.prisma.withSystemAccess(async () => {
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
    })
  }

  async remove(memberId: string): Promise<void> {
    return this.prisma.withSystemAccess(async () => {
      await this.prisma.client.member.delete({
        where: { id: memberId },
      })
    })
  }

  async findMembership(
    organizationId: string,
    userId: string
  ): Promise<{ id: string; role: string; organizationId: string } | null> {
    return this.prisma.withSystemAccess(async () => {
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
    })
  }

  async countOwners(organizationId: string): Promise<number> {
    return this.prisma.withSystemAccess(async () => {
      return this.prisma.client.member.count({
        where: { organizationId, role: 'owner' },
      })
    })
  }
}
