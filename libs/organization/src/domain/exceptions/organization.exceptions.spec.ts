import { describe, expect, it } from 'vitest'

import {
  CannotModifyOwnerError,
  CannotRemoveLastOwnerError,
  InsufficientPermissionsError,
  InvalidInvitationError,
  InvitationEmailMismatchError,
  MemberNotFoundError,
  NotOrganizationMemberError,
  OrganizationDomainError,
  OrganizationSlugExistsError,
  UserAlreadyMemberError,
} from './organization.exceptions'

describe('OrganizationDomainError', () => {
  it('should set message and derive name from constructor', () => {
    const error = new OrganizationDomainError('base failure')

    expect(error.message).toBe('base failure')
    expect(error.name).toBe('OrganizationDomainError')
    expect(error).toBeInstanceOf(Error)
  })

  it('should be throwable and catchable', () => {
    expect(() => {
      throw new OrganizationDomainError('thrown')
    }).toThrow('thrown')
  })
})

describe('OrganizationSlugExistsError', () => {
  it('should include the slug in the message and keep it as a property', () => {
    const error = new OrganizationSlugExistsError('acme')

    expect(error.message).toBe('Organization slug already exists: acme')
    expect(error.slug).toBe('acme')
    expect(error.name).toBe('OrganizationSlugExistsError')
    expect(error).toBeInstanceOf(OrganizationDomainError)
  })
})

describe('NotOrganizationMemberError', () => {
  it('should expose organizationId and userId with the fixed message', () => {
    const error = new NotOrganizationMemberError('org-1', 'user-1')

    expect(error.message).toBe('Not a member of this organization')
    expect(error.organizationId).toBe('org-1')
    expect(error.userId).toBe('user-1')
    expect(error.name).toBe('NotOrganizationMemberError')
    expect(error).toBeInstanceOf(OrganizationDomainError)
  })
})

describe('InsufficientPermissionsError', () => {
  it('should join required permissions and render the actual list', () => {
    const error = new InsufficientPermissionsError(['admin', 'owner'], 'member')

    expect(error.message).toBe('Insufficient permissions. Required: admin|owner, Actual: member')
    expect(error.required).toEqual(['admin', 'owner'])
    expect(error.actual).toBe('member')
    expect(error.name).toBe('InsufficientPermissionsError')
  })

  it('should render "none" when actual permissions are null', () => {
    const error = new InsufficientPermissionsError(['admin'], null)

    expect(error.message).toBe('Insufficient permissions. Required: admin, Actual: none')
    expect(error.actual).toBeNull()
  })

  it('should handle an empty required list', () => {
    const error = new InsufficientPermissionsError([], 'admin')

    expect(error.message).toBe('Insufficient permissions. Required: , Actual: admin')
  })
})

describe('MemberNotFoundError', () => {
  it('should include the member id in message and property', () => {
    const error = new MemberNotFoundError('member-42')

    expect(error.message).toBe('Member not found: member-42')
    expect(error.memberId).toBe('member-42')
    expect(error.name).toBe('MemberNotFoundError')
  })
})

describe('CannotModifyOwnerError', () => {
  it('should use the fixed owner-modification message', () => {
    const error = new CannotModifyOwnerError()

    expect(error.message).toBe('Admins cannot modify owner roles')
    expect(error.name).toBe('CannotModifyOwnerError')
    expect(error).toBeInstanceOf(OrganizationDomainError)
  })
})

describe('CannotRemoveLastOwnerError', () => {
  it('should use the fixed last-owner message', () => {
    const error = new CannotRemoveLastOwnerError()

    expect(error.message).toBe('Cannot remove last owner')
    expect(error.name).toBe('CannotRemoveLastOwnerError')
    expect(error).toBeInstanceOf(OrganizationDomainError)
  })
})

describe('InvalidInvitationError', () => {
  it.each(['not_found', 'expired', 'already_used'] as const)(
    'should render reason "%s" in the message and keep it as a property',
    (reason) => {
      const error = new InvalidInvitationError(reason)

      expect(error.message).toBe(`Invalid invitation: ${reason}`)
      expect(error.reason).toBe(reason)
      expect(error.name).toBe('InvalidInvitationError')
    }
  )
})

describe('InvitationEmailMismatchError', () => {
  it('should expose expected and actual emails with the fixed message', () => {
    const error = new InvitationEmailMismatchError('a@example.com', 'b@example.com')

    expect(error.message).toBe('Email does not match invitation')
    expect(error.expected).toBe('a@example.com')
    expect(error.actual).toBe('b@example.com')
    expect(error.name).toBe('InvitationEmailMismatchError')
  })
})

describe('UserAlreadyMemberError', () => {
  it('should include the email in message and property', () => {
    const error = new UserAlreadyMemberError('user@example.com')

    expect(error.message).toBe('User is already a member: user@example.com')
    expect(error.email).toBe('user@example.com')
    expect(error.name).toBe('UserAlreadyMemberError')
  })
})
