import type {
  CreateOrganizationDto,
  IOrganizationRepository,
  OrganizationWithRole,
  UpdateOrganizationDto,
} from '../../domain'
import type { DatabaseService, Organization as PrismaOrganization } from '@vyrak/database'

export class OrganizationPrismaRepository implements IOrganizationRepository {
  constructor(private readonly prisma: DatabaseService) {}

  /**
   * Map Prisma Organization to OrganizationWithRole
   * Centralized mapping to avoid duplication
   */
  private async mapToEntity(
    organization: PrismaOrganization,
    role: string,
    memberCount?: number
  ): Promise<OrganizationWithRole> {
    const count =
      memberCount ??
      (await this.prisma.client.member.count({
        where: { organizationId: organization.id },
      }))

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      role: role as 'owner' | 'admin' | 'member',
      memberCount: count,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    }
  }

  async create(userId: string, data: CreateOrganizationDto): Promise<OrganizationWithRole> {
    return this.prisma.withSystemAccess(async () => {
      const organization = await this.prisma.client.organization.create({
        data: {
          name: data.name,
          slug: data.slug,
          logo: data.logo,
        },
      })

      await this.prisma.client.member.create({
        data: {
          organizationId: organization.id,
          userId,
          role: 'owner',
        },
      })

      const memberCount = await this.prisma.client.member.count({
        where: { organizationId: organization.id },
      })

      return this.mapToEntity(organization, 'owner', memberCount)
    })
  }

  async findAllForUser(userId: string): Promise<OrganizationWithRole[]> {
    return this.prisma.withSystemAccess(async () => {
      const memberships = await this.prisma.client.member.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'asc',
        },
      })

      const organizations = await Promise.all(
        memberships.map(async (m) => {
          const organization = await this.prisma.client.organization.findUnique({
            where: { id: m.organizationId },
          })

          if (!organization) {
            return null
          }

          const memberCount = await this.prisma.client.member.count({
            where: { organizationId: organization.id },
          })

          return this.mapToEntity(organization, m.role, memberCount)
        })
      )

      return organizations.filter((org): org is OrganizationWithRole => org !== null)
    })
  }

  async findOne(id: string, userId: string): Promise<OrganizationWithRole | null> {
    return this.prisma.withSystemAccess(async () => {
      const membership = await this.prisma.client.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: id,
            userId,
          },
        },
      })

      if (!membership) {
        return null
      }

      const organization = await this.prisma.client.organization.findUnique({
        where: { id: membership.organizationId },
      })

      if (!organization) {
        return null
      }

      const memberCount = await this.prisma.client.member.count({
        where: { organizationId: organization.id },
      })

      return this.mapToEntity(organization, membership.role, memberCount)
    })
  }

  async update(id: string, data: Partial<UpdateOrganizationDto>): Promise<OrganizationWithRole> {
    return this.prisma.withSystemAccess(async () => {
      const organization = await this.prisma.client.organization.update({
        where: { id },
        data,
      })

      const member = await this.prisma.client.member.findFirst({
        where: { organizationId: id },
      })

      const memberCount = await this.prisma.client.member.count({
        where: { organizationId: id },
      })

      return this.mapToEntity(organization, member?.role || 'member', memberCount)
    })
  }

  async findBySlug(slug: string): Promise<{ id: string } | null> {
    return this.prisma.withSystemAccess(async () => {
      return this.prisma.client.organization.findUnique({
        where: { slug },
        select: { id: true },
      })
    })
  }
}
