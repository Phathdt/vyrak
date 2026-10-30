import type {
  CreateOrganizationDto,
  IOrganizationRepository,
  OrganizationWithRole,
  UpdateOrganizationDto,
} from '../../domain'
import type { DatabaseService } from '@vyrak/database'

export class OrganizationPrismaRepository implements IOrganizationRepository {
  constructor(private readonly prisma: DatabaseService) {}

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

      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        role: 'owner',
        memberCount,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      }
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
        memberships.map(
          async (m: {
            id: string
            userId: string
            organizationId: string
            role: string
            createdAt: Date
            updatedAt: Date
          }) => {
            const organization = await this.prisma.client.organization.findUnique({
              where: { id: m.organizationId },
            })

            if (!organization) {
              return null
            }

            const memberCount = await this.prisma.client.member.count({
              where: { organizationId: organization.id },
            })

            return {
              id: organization.id,
              name: organization.name,
              slug: organization.slug,
              logo: organization.logo,
              role: m.role,
              memberCount,
              createdAt: organization.createdAt,
              updatedAt: organization.updatedAt,
            }
          }
        )
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

      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        role: membership.role,
        memberCount,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      }
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

      return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        role: member?.role || 'member',
        memberCount,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      }
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
