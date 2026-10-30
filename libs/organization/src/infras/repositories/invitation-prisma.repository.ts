import type { IInvitationRepository, InvitationResponse, InviteMemberDto } from '../../domain'
import type { DatabaseService } from '@vyrak/database'

export class InvitationPrismaRepository implements IInvitationRepository {
  constructor(private readonly prisma: DatabaseService) {}

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

      const organization = await this.prisma.client.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      })

      return {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        organization: organization || { id: organizationId, name: '', slug: '' },
      }
    })
  }

  async findOne(id: string): Promise<
    | (InvitationResponse & {
        organizationId: string
        organization: { id: string; name: string; slug: string }
      })
    | null
  > {
    return this.prisma.withSystemAccess(async () => {
      const invitation = await this.prisma.client.invitation.findUnique({
        where: { id },
      })

      if (!invitation) {
        return null
      }

      const organization = await this.prisma.client.organization.findUnique({
        where: { id: invitation.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      })

      return {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        organizationId: invitation.organizationId,
        organization: organization || { id: invitation.organizationId, name: '', slug: '' },
      }
    })
  }

  async updateStatus(id: string, status: 'accepted' | 'rejected'): Promise<void> {
    return this.prisma.withSystemAccess(async () => {
      await this.prisma.client.invitation.update({
        where: { id },
        data: { status },
      })
    })
  }

  async listForOrganization(organizationId: string): Promise<InvitationResponse[]> {
    return this.prisma.withSystemAccess(async () => {
      const invitations = await this.prisma.client.invitation.findMany({
        where: {
          organizationId,
          status: 'pending',
        },
        orderBy: { createdAt: 'desc' },
      })

      return invitations.map(
        (inv: {
          id: string
          email: string
          role: string
          status: string
          expiresAt: Date
          createdAt: Date
        }): InvitationResponse => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          status: inv.status,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
        })
      )
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

      const invitationsWithOrg = await Promise.all(
        invitations.map(
          async (inv: {
            id: string
            email: string
            role: string
            status: string
            expiresAt: Date
            createdAt: Date
            organizationId: string
          }) => {
            const organization = await this.prisma.client.organization.findUnique({
              where: { id: inv.organizationId },
              select: {
                id: true,
                name: true,
                slug: true,
              },
            })

            return {
              id: inv.id,
              email: inv.email,
              role: inv.role,
              status: inv.status,
              expiresAt: inv.expiresAt,
              createdAt: inv.createdAt,
              organization: organization || { id: inv.organizationId, name: '', slug: '' },
            }
          }
        )
      )

      return invitationsWithOrg
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
        data: { status: 'cancelled' },
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
