import type { CreateOrganizationDto, OrganizationWithRole, UpdateOrganizationDto } from '../schemas'

export interface IOrganizationService {
  create(userId: string, data: CreateOrganizationDto): Promise<OrganizationWithRole>
  findAllForUser(userId: string): Promise<OrganizationWithRole[]>
  findOne(id: string, userId: string): Promise<OrganizationWithRole>
  update(id: string, userId: string, data: UpdateOrganizationDto): Promise<OrganizationWithRole>
  verifyMembership(
    organizationId: string,
    userId: string,
    allowedRoles: string[]
  ): Promise<{ id: string; role: string }>
}
