import type { CreateOrganizationDto, OrganizationWithRole, UpdateOrganizationDto } from '../schemas'

export interface IOrganizationRepository {
  create(userId: string, data: CreateOrganizationDto): Promise<OrganizationWithRole>
  findAllForUser(userId: string): Promise<OrganizationWithRole[]>
  findOne(id: string, userId: string): Promise<OrganizationWithRole | null>
  update(id: string, data: Partial<UpdateOrganizationDto>): Promise<OrganizationWithRole>
  findBySlug(slug: string): Promise<{ id: string } | null>
}
