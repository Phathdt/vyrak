import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InvitationsService } from './invitations.service'
import { MembersService } from './members.service'
import { OrganizationsController, InvitationsController } from './organizations.controller'
import { OrganizationsService } from './organizations.service'

describe('OrganizationsController', () => {
  let controller: OrganizationsController
  let organizationsService: OrganizationsService
  let membersService: MembersService
  let invitationsService: InvitationsService

  const mockOrganizationResponse = {
    id: 'org-123',
    name: 'Test Org',
    slug: 'test-org',
    logo: null,
    role: 'owner',
    memberCount: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockMemberResponse = {
    id: 'member-1',
    userId: 'user-123',
    organizationId: 'org-123',
    role: 'admin',
    createdAt: new Date(),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: OrganizationsService,
          useValue: {
            create: vi.fn(),
            findAll: vi.fn(),
            findAllForUser: vi.fn(),
            findOne: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          },
        },
        {
          provide: MembersService,
          useValue: {
            list: vi.fn(),
            updateRole: vi.fn(),
            remove: vi.fn(),
          },
        },
        {
          provide: InvitationsService,
          useValue: {
            invite: vi.fn(),
            listForOrganization: vi.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get(OrganizationsController)
    organizationsService = module.get(OrganizationsService)
    membersService = module.get(MembersService)
    invitationsService = module.get(InvitationsService)
  })

  describe('create', () => {
    it('should create organization', async () => {
      const createDto = { name: 'New Org', slug: 'new-org' }

      vi.mocked(organizationsService.create).mockResolvedValue(mockOrganizationResponse)

      const result = await controller.create('user-123', createDto as any)

      expect(result).toEqual(mockOrganizationResponse)
      expect(organizationsService.create).toHaveBeenCalledWith('user-123', createDto)
    })
  })

  describe('findAll', () => {
    it('should return all organizations for user', async () => {
      const mockOrganizations = [mockOrganizationResponse]

      vi.mocked(organizationsService.findAllForUser).mockResolvedValue(mockOrganizations)

      const result = await controller.findAll('user-123')

      expect(result).toEqual(mockOrganizations)
      expect(organizationsService.findAllForUser).toHaveBeenCalledWith('user-123')
    })

    it('should return empty array when user has no organizations', async () => {
      vi.mocked(organizationsService.findAllForUser).mockResolvedValue([])

      const result = await controller.findAll('user-456')

      expect(result).toEqual([])
    })
  })

  describe('findOne', () => {
    it('should return organization details', async () => {
      vi.mocked(organizationsService.findOne).mockResolvedValue(mockOrganizationResponse)

      const result = await controller.findOne('org-123', 'user-123')

      expect(result).toEqual(mockOrganizationResponse)
      expect(organizationsService.findOne).toHaveBeenCalledWith('org-123', 'user-123')
    })
  })

  describe('update', () => {
    it('should update organization', async () => {
      const updateDto = { name: 'Updated Org' }
      const updated = { ...mockOrganizationResponse, name: 'Updated Org' }

      vi.mocked(organizationsService.update).mockResolvedValue(updated)

      const result = await controller.update('org-123', 'user-123', updateDto as any)

      expect(result).toEqual(updated)
      expect(organizationsService.update).toHaveBeenCalledWith('org-123', 'user-123', updateDto)
    })
  })

  describe('delete', () => {
    it('should delete organization', async () => {
      vi.mocked(organizationsService.delete).mockResolvedValue(undefined)

      const result = await controller.delete('org-123', 'user-123')

      expect(organizationsService.delete).toHaveBeenCalledWith('org-123', 'user-123')
    })
  })

  describe('listMembers', () => {
    it('should list organization members', async () => {
      const mockMembers = [mockMemberResponse]

      vi.mocked(membersService.list).mockResolvedValue(mockMembers)

      const result = await controller.listMembers('org-123', 'user-123')

      expect(result).toEqual(mockMembers)
      expect(membersService.list).toHaveBeenCalledWith('org-123', 'user-123')
    })
  })

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const updateDto = { role: 'owner' }
      const updated = { ...mockMemberResponse, role: 'owner' }

      vi.mocked(membersService.updateRole).mockResolvedValue(updated)

      const result = await controller.updateMemberRole('org-123', 'member-1', 'user-123', updateDto as any)

      expect(result).toEqual(updated)
      expect(membersService.updateRole).toHaveBeenCalledWith('org-123', 'member-1', 'user-123', updateDto)
    })
  })

  describe('removeMember', () => {
    it('should remove member from organization', async () => {
      vi.mocked(membersService.remove).mockResolvedValue(undefined)

      const result = await controller.removeMember('org-123', 'member-1', 'user-123')

      expect(result).toEqual({ success: true })
      expect(membersService.remove).toHaveBeenCalledWith('org-123', 'member-1', 'user-123')
    })
  })

  describe('inviteMember', () => {
    it('should invite member to organization', async () => {
      const inviteDto = { email: 'newuser@example.com' }
      const mockInvitation = {
        id: 'inv-1',
        email: 'newuser@example.com',
        organizationId: 'org-123',
        status: 'pending',
        createdAt: new Date(),
      }

      vi.mocked(invitationsService.invite).mockResolvedValue(mockInvitation as any)

      const result = await controller.inviteMember('org-123', 'user-123', inviteDto as any)

      expect(result).toEqual(mockInvitation)
      expect(invitationsService.invite).toHaveBeenCalledWith('org-123', 'user-123', inviteDto)
    })
  })

  describe('listInvitations', () => {
    it('should list pending invitations for organization', async () => {
      const mockInvitations = [
        {
          id: 'inv-1',
          email: 'user1@example.com',
          organizationId: 'org-123',
          status: 'pending',
        },
      ]

      vi.mocked(invitationsService.listForOrganization).mockResolvedValue(mockInvitations as any)

      const result = await controller.listInvitations('org-123', 'user-123')

      expect(result).toEqual(mockInvitations)
      expect(invitationsService.listForOrganization).toHaveBeenCalledWith('org-123', 'user-123')
    })
  })
})

describe('InvitationsController', () => {
  let controller: InvitationsController
  let invitationsService: InvitationsService

  const mockInvitation = {
    id: 'inv-1',
    email: 'user@example.com',
    organizationId: 'org-123',
    status: 'pending',
    createdAt: new Date(),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        {
          provide: InvitationsService,
          useValue: {
            listForUserId: vi.fn(),
            accept: vi.fn(),
            reject: vi.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get(InvitationsController)
    invitationsService = module.get(InvitationsService)
  })

  describe('listUserInvitations', () => {
    it('should list pending invitations for user', async () => {
      const mockInvitations = [mockInvitation]

      vi.mocked(invitationsService.listForUserId).mockResolvedValue(mockInvitations as any)

      const result = await controller.listUserInvitations('user-123')

      expect(result).toEqual(mockInvitations)
      expect(invitationsService.listForUserId).toHaveBeenCalledWith('user-123')
    })

    it('should return empty array when user has no invitations', async () => {
      vi.mocked(invitationsService.listForUserId).mockResolvedValue([])

      const result = await controller.listUserInvitations('user-456')

      expect(result).toEqual([])
    })
  })

  describe('accept', () => {
    it('should accept invitation', async () => {
      const accepted = { ...mockInvitation, status: 'accepted' }

      vi.mocked(invitationsService.accept).mockResolvedValue(accepted as any)

      const result = await controller.accept('inv-1', 'user-123')

      expect(result).toEqual(accepted)
      expect(invitationsService.accept).toHaveBeenCalledWith('inv-1', 'user-123')
    })
  })

  describe('reject', () => {
    it('should reject invitation', async () => {
      vi.mocked(invitationsService.reject).mockResolvedValue(undefined)

      const result = await controller.reject('inv-1', 'user-123')

      expect(result).toEqual({ success: true })
      expect(invitationsService.reject).toHaveBeenCalledWith('inv-1', 'user-123')
    })
  })
})
