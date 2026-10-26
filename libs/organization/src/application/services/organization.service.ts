import { BadRequestException, ForbiddenException } from '@nestjs/common'

import type { IOrganizationRepository } from '../../domain/interfaces/organization-repository.interface'
import type { IOrganizationService } from '../../domain/interfaces/organization-service.interface'
import type { CreateOrganizationDto, OrganizationWithRole, UpdateOrganizationDto } from '../../domain/schemas'

export class OrganizationService implements IOrganizationService {
  constructor(private readonly repository: IOrganizationRepository) {}

  async create(userId: string, data: CreateOrganizationDto): Promise<OrganizationWithRole> {
    const existing = await this.repository.findBySlug(data.slug)

    if (existing) {
      throw new BadRequestException('Organization slug already exists')
    }

    return this.repository.create(userId, data)
  }

  async findAllForUser(userId: string): Promise<OrganizationWithRole[]> {
    return this.repository.findAllForUser(userId)
  }

  async findOne(id: string, userId: string): Promise<OrganizationWithRole> {
    const organization = await this.repository.findOne(id, userId)

    if (!organization) {
      throw new ForbiddenException('Not a member of this organization')
    }

    return organization
  }

  async update(id: string, userId: string, data: UpdateOrganizationDto): Promise<OrganizationWithRole> {
    await this.verifyMembership(id, userId, ['owner', 'admin'])

    return this.repository.update(id, data)
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.verifyMembership(id, userId, ['owner'])

    const activeRuns = await this.repository.countActiveWorkflowRuns(id)

    if (activeRuns > 0) {
      throw new BadRequestException(`Cannot delete organization with ${activeRuns} active workflow run(s)`)
    }

    await this.repository.delete(id)
  }

  async verifyMembership(organizationId: string, userId: string, allowedRoles: string[]) {
    const organization = await this.repository.findOne(organizationId, userId)

    if (!organization) {
      throw new ForbiddenException('Not a member of this organization')
    }

    if (!allowedRoles.includes(organization.role)) {
      throw new ForbiddenException('Insufficient permissions')
    }

    return { id: organization.id, role: organization.role }
  }
}
