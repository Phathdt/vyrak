import type { IInvitationRepository, InvitationResponse, InviteMemberDto } from '../../domain'
import type { DatabaseService, Invitation as PrismaInvitation } from '@vyrak/database'

export class InvitationPrismaRepository implements IInvitationRepository {
  constructor(private readonly prisma: DatabaseService) {}

  /**
   * Map Prisma Invitation to InvitationResponse
   * Centralized mapping to avoid duplication
   */
  private async mapToEntity(
    invitation: PrismaInvitation,
    includeOrgDetails: boolean = false
  ): Promise<
    | InvitationResponse
    | (InvitationResponse & { organizationId: string; organization: { id: string; name: string; slug: string } })
  > {
    const base: InvitationResponse = {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status as 'pending' | 'accepted' | 'rejected' | 'cancelled',
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    }

    if (includeOrgDetails) {
      const organization = await this.prisma.client.organization.findUnique({
        where: { id: invitation.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      })

      return {
        ...base,
        organizationId: invitation.organizationId,
        organization: organization || { id: invitation.organizationId, name: '', slug: '' },
      }
    }

    return base
  }

  async create(
    organizationId: string,
    inviterId: string,
    data: InviteMemberDto,
    expiresAt: Date
  ): Promise<InvitationResponse> {
    return this.prisma.withSystemAccess(async () => {
      const invitation = await this.prisma.client.invitation.create({
        data: {
          organizationId,
          email: data.email,
          role: data.role,
          inviterId,
          status: 'pending',
          expiresAt,
        },
      })

      return this.mapToEntity(invitation)
    })
  }

  async listForOrganization(organizationId: string): Promise<InvitationResponse[]> {
    return this.prisma.withSystemAccess(async () => {
      const invitations = await this.prisma.client.invitation.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      })

      return Promise.all(invitations.map((inv) => this.mapToEntity(inv)))
    })
  }

  async findOne(
    invitationId: string
  ): Promise<
    (InvitationResponse & { organizationId: string; organization: { id: string; name: string; slug: string } }) | null
  > {
    return this.prisma.withSystemAccess(async () => {
      const invitation = await this.prisma.client.invitation.findUnique({
        where: { id: invitationId },
      })

      if (!invitation) {
        return null
      }

      return this.mapToEntity(invitation, true) as Promise<
        InvitationResponse & { organizationId: string; organization: { id: string; name: string; slug: string } }
      >
    })
  }

  async updateStatus(invitationId: string, status: 'accepted' | 'rejected'): Promise<void> {
    return this.prisma.withSystemAccess(async () => {
      await this.prisma.client.invitation.update({
        where: { id: invitationId },
        data: { status },
      })
    })
  }

  async listForUserEmail(email: string): Promise<InvitationResponse[]> {
    return this.prisma.withSystemAccess(async () => {
      const invitations = await this.prisma.client.invitation.findMany({
        where: {
          email,
          status: 'pending',
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return Promise.all(invitations.map((inv) => this.mapToEntity(inv)))
    })
  }

  async cancelPending(organizationId: string, email: string): Promise<void> {
    return this.prisma.withSystemAccess(async () => {
      await this.prisma.client.invitation.updateMany({
        where: {
          organizationId,
          email,
          status: 'pending',
        },
        data: {
          status: 'cancelled',
        },
      })
    })
  }

  async findExistingMember(organizationId: string, email: string): Promise<{ id: string } | null> {
    return this.prisma.withSystemAccess(async () => {
      // First find user by email
      const user = await this.prisma.rawClient.user.findUnique({
        where: { email },
        select: { id: true },
      })

      if (!user) {
        return null
      }

      // Then find member by userId and organizationId
      return this.prisma.client.member.findFirst({
        where: {
          organizationId,
          userId: user.id,
        },
        select: { id: true },
      })
    })
  }

  async createMembership(organizationId: string, userId: string, role: string): Promise<void> {
    return this.prisma.withSystemAccess(async () => {
      await this.prisma.client.member.create({
        data: {
          organizationId,
          userId,
          role,
        },
      })
    })
  }
}
