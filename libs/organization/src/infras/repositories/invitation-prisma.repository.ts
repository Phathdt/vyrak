import type { DatabaseService, Invitation } from '@vyrak/database'

import type { IInvitationRepository } from '../../domain/interfaces/invitation-repository.interface'
import type { InvitationResponse, InviteMemberDto } from '../../domain/schemas'

export class InvitationPrismaRepository implements IInvitationRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async create(
    organizationId: string,
    inviterId: string,
    data: InviteMemberDto,
    expiresAt: Date
  ): Promise<InvitationResponse> {
    const invitation = await this.prisma.client.invitation.create({
      data: {
        organizationId,
        email: data.email,
        role: data.role,
        inviterId,
        status: 'pending',
        expiresAt,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      organization: invitation.organization,
    }
  }

  async findOne(id: string): Promise<
    | (InvitationResponse & {
        organizationId: string
        organization: { id: string; name: string; slug: string }
      })
    | null
  > {
    const invitation = await this.prisma.client.invitation.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    if (!invitation) {
      return null
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      organizationId: invitation.organizationId,
      organization: invitation.organization,
    }
  }

  async updateStatus(id: string, status: 'accepted' | 'rejected'): Promise<void> {
    await this.prisma.client.invitation.update({
      where: { id },
      data: { status },
    })
  }

  async listForOrganization(organizationId: string): Promise<InvitationResponse[]> {
    const invitations = await this.prisma.client.invitation.findMany({
      where: {
        organizationId,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    })

    return invitations.map((inv: Invitation): InvitationResponse => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    }))
  }

  async listForUserEmail(email: string): Promise<InvitationResponse[]> {
    const invitations = await this.prisma.client.invitation.findMany({
      where: {
        email,
        status: 'pending',
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return invitations.map(
      (inv: Invitation & { organization: { id: string; name: string; slug: string } }): InvitationResponse => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        organization: inv.organization,
      })
    )
  }

  async cancelPending(organizationId: string, email: string): Promise<void> {
    await this.prisma.client.invitation.updateMany({
      where: {
        organizationId,
        email,
        status: 'pending',
      },
      data: { status: 'cancelled' },
    })
  }

  async findExistingMember(organizationId: string, email: string): Promise<{ id: string } | null> {
    return this.prisma.client.member.findFirst({
      where: {
        organizationId,
        user: { email },
      },
      select: { id: true },
    })
  }

  async createMembership(organizationId: string, userId: string, role: string): Promise<void> {
    await this.prisma.client.member.create({
      data: {
        organizationId,
        userId,
        role,
      },
    })
  }
}
