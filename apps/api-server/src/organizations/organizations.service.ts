import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { DatabaseService, type Member, type Organization } from '@vyrak/database'

import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'

export interface OrganizationWithRole {
  id: string
  name: string
  slug: string
  logo: string | null
  role: string
  memberCount: number
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: DatabaseService) {}

  /**
   * Tạo organization mới với creator làm owner
   */
  async create(userId: string, data: CreateOrganizationDto): Promise<OrganizationWithRole> {
    // Check slug uniqueness
    const existing = await this.prisma.client.organization.findUnique({
      where: { slug: data.slug },
    })

    if (existing) {
      throw new BadRequestException('Organization slug already exists')
    }

    // Create organization + owner membership atomically
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

  /**
   * List tất cả organizations của user
   */
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

  /**
   * Get organization details (chỉ members)
   */
  async findOne(id: string, userId: string): Promise<OrganizationWithRole> {
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
      throw new ForbiddenException('Not a member of this organization')
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

  /**
   * Update organization (admin/owner only)
   */
  async update(id: string, userId: string, data: UpdateOrganizationDto): Promise<OrganizationWithRole> {
    // Verify membership (admin or owner)
    const membership = await this.verifyMembership(id, userId, ['owner', 'admin'])

    const organization = await this.prisma.client.organization.update({
      where: { id },
      data,
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
      role: membership.role,
      memberCount: organization._count.members,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    }
  }

  /**
   * Delete organization (owner only, with safety checks)
   */
  async delete(id: string, userId: string): Promise<void> {
    // Only owner can delete
    await this.verifyMembership(id, userId, ['owner'])

    // Block if active workflow runs
    const activeRuns = await this.prisma.client.workflowRun.count({
      where: {
        organizationId: id,
        status: { in: ['pending', 'running'] },
      },
    })

    if (activeRuns > 0) {
      throw new BadRequestException(`Cannot delete organization with ${activeRuns} active workflow run(s)`)
    }

    await this.prisma.client.organization.delete({
      where: { id },
    })
  }

  /**
   * Verify user membership với allowed roles
   */
  async verifyMembership(organizationId: string, userId: string, allowedRoles: string[]) {
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

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions')
    }

    return membership
  }
}
