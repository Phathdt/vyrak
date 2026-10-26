import type { DatabaseService, Member, Organization } from '@vyrak/database'

import type {
  CreateOrganizationDto,
  IOrganizationRepository,
  OrganizationWithRole,
  UpdateOrganizationDto,
} from '../../domain'

export class OrganizationPrismaRepository implements IOrganizationRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async create(userId: string, data: CreateOrganizationDto): Promise<OrganizationWithRole> {
    const organization = await this.prisma.client.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        logo: data.logo,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    })

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      role: 'owner',
      memberCount: organization._count.members,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    }
  }

  async findAllForUser(userId: string): Promise<OrganizationWithRole[]> {
    const memberships = await this.prisma.client.member.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return memberships.map(
      (m: Member & { organization: Organization & { _count: { members: number } } }): OrganizationWithRole => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        logo: m.organization.logo,
        role: m.role,
        memberCount: m.organization._count.members,
        createdAt: m.organization.createdAt,
        updatedAt: m.organization.updatedAt,
      })
    )
  }

  async findOne(id: string, userId: string): Promise<OrganizationWithRole | null> {
    const membership = await this.prisma.client.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId,
        },
      },
      include: {
        organization: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
    })

    if (!membership) {
      return null
    }

    return {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      logo: membership.organization.logo,
      role: membership.role,
      memberCount: membership.organization._count.members,
      createdAt: membership.organization.createdAt,
      updatedAt: membership.organization.updatedAt,
    }
  }

  async update(id: string, data: Partial<UpdateOrganizationDto>): Promise<OrganizationWithRole> {
    const organization = await this.prisma.client.organization.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { members: true },
        },
        members: {
          take: 1,
          select: { role: true },
        },
      },
    })

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
      role: organization.members[0]?.role || 'member',
      memberCount: organization._count.members,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.organization.delete({
      where: { id },
    })
  }

  async findBySlug(slug: string): Promise<{ id: string } | null> {
    return this.prisma.client.organization.findUnique({
      where: { slug },
      select: { id: true },
    })
  }

  async countActiveWorkflowRuns(organizationId: string): Promise<number> {
    return this.prisma.client.workflowRun.count({
      where: {
        organizationId,
        status: { in: ['pending', 'running'] },
      },
    })
  }
}
