import type { IMemberRepository, MemberResponse, UpdateMemberRoleDto } from '../../domain'
import type { DatabaseService } from '@vyrak/database'

export class MemberPrismaRepository implements IMemberRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async list(organizationId: string): Promise<MemberResponse[]> {
    return this.prisma.withSystemAccess(async () => {
      const members = await this.prisma.client.member.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
      })

      const membersWithUsers = await Promise.all(
        members.map(async (m) => {
          const user = await this.prisma.client.user.findUnique({
            where: { id: m.userId },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          })

          return {
            id: m.id,
            role: m.role,
            createdAt: m.createdAt,
            user: user || { id: m.userId, name: null, email: '', image: null },
          }
        })
      )

      return membersWithUsers
    })
  }

  async findOne(memberId: string): Promise<(MemberResponse & { organizationId: string }) | null> {
    return this.prisma.withSystemAccess(async () => {
      const member = await this.prisma.client.member.findUnique({
        where: { id: memberId },
      })

      if (!member) {
        return null
      }

      const user = await this.prisma.client.user.findUnique({
        where: { id: member.userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      })

      return {
        id: member.id,
        role: member.role,
        createdAt: member.createdAt,
        organizationId: member.organizationId,
        user: user || { id: member.userId, name: null, email: '', image: null },
      }
    })
  }

  async updateRole(memberId: string, role: UpdateMemberRoleDto['role']): Promise<MemberResponse> {
    return this.prisma.withSystemAccess(async () => {
      const updated = await this.prisma.client.member.update({
        where: { id: memberId },
        data: { role },
      })

      const user = await this.prisma.client.user.findUnique({
        where: { id: updated.userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      })

      return {
        id: updated.id,
        role: updated.role,
        createdAt: updated.createdAt,
        user: user || {
          id: updated.userId,
          name: null,
          email: '',
          image: null,
        },
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
