import type { IMemberRepository, MemberResponse, UpdateMemberRoleDto } from '../../domain'
import type { DatabaseService, Member as PrismaMember } from '@vyrak/database'

export class MemberPrismaRepository implements IMemberRepository {
  constructor(private readonly prisma: DatabaseService) {}

  /**
   * Map Prisma Member to MemberResponse
   * Centralized mapping to avoid duplication
   */
  private async mapToEntity(
    member: PrismaMember,
    includeOrgId: boolean = false
  ): Promise<MemberResponse | (MemberResponse & { organizationId: string })> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: member.userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    })

    const base = {
      id: member.id,
      role: member.role as 'owner' | 'admin' | 'member',
      createdAt: member.createdAt,
      user: user || { id: member.userId, name: null, email: '', image: null },
    }

    if (includeOrgId) {
      return {
        ...base,
        organizationId: member.organizationId,
      }
    }

    return base
  }

  async list(organizationId: string): Promise<MemberResponse[]> {
    return this.prisma.withSystemAccess(async () => {
      const members = await this.prisma.client.member.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
      })

      return Promise.all(members.map((m) => this.mapToEntity(m)))
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

      return this.mapToEntity(member, true) as Promise<MemberResponse & { organizationId: string }>
    })
  }

  async updateRole(memberId: string, role: UpdateMemberRoleDto['role']): Promise<MemberResponse> {
    return this.prisma.withSystemAccess(async () => {
      const updated = await this.prisma.client.member.update({
        where: { id: memberId },
        data: { role },
      })

      return this.mapToEntity(updated)
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
