import { InsufficientPermissionsError, NotOrganizationMemberError, OrganizationSlugExistsError } from '../../domain'

import type {
  CreateOrganizationDto,
  IOrganizationRepository,
  IOrganizationService,
  OrganizationWithRole,
  UpdateOrganizationDto,
} from '../../domain'

export class OrganizationService implements IOrganizationService {
  constructor(private readonly repository: IOrganizationRepository) {}

  async create(userId: string, data: CreateOrganizationDto): Promise<OrganizationWithRole> {
    const existing = await this.repository.findBySlug(data.slug)

    if (existing) {
      throw new OrganizationSlugExistsError(data.slug)
    }

    return this.repository.create(userId, data)
  }

  async findAllForUser(userId: string): Promise<OrganizationWithRole[]> {
    return this.repository.findAllForUser(userId)
  }

  async findOne(id: string, userId: string): Promise<OrganizationWithRole> {
    const organization = await this.repository.findOne(id, userId)

    if (!organization) {
      throw new NotOrganizationMemberError(id, userId)
    }

    return organization
  }

  async update(id: string, userId: string, data: UpdateOrganizationDto): Promise<OrganizationWithRole> {
    await this.verifyMembership(id, userId, ['owner', 'admin'])

    return this.repository.update(id, data)
  }

  async verifyMembership(organizationId: string, userId: string, allowedRoles: string[]) {
    const organization = await this.repository.findOne(organizationId, userId)

    if (!organization) {
      throw new NotOrganizationMemberError(organizationId, userId)
    }

    if (!allowedRoles.includes(organization.role)) {
      throw new InsufficientPermissionsError(allowedRoles, organization.role)
    }

    return { id: organization.id, role: organization.role }
  }
}
