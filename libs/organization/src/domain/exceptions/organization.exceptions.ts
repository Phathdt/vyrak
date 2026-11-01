/**
 * Base domain error for organization module
 */
export class OrganizationDomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Thrown when attempting to create an organization with a slug that already exists
 */
export class OrganizationSlugExistsError extends OrganizationDomainError {
  constructor(public readonly slug: string) {
    super(`Organization slug already exists: ${slug}`)
  }
}

/**
 * Thrown when a user attempts to access an organization they are not a member of
 */
export class NotOrganizationMemberError extends OrganizationDomainError {
  constructor(
    public readonly organizationId: string,
    public readonly userId: string
  ) {
    super('Not a member of this organization')
  }
}

/**
 * Thrown when a user lacks the required permissions for an operation
 */
export class InsufficientPermissionsError extends OrganizationDomainError {
  constructor(
    public readonly required: string[],
    public readonly actual: string | null
  ) {
    super(`Insufficient permissions. Required: ${required.join('|')}, Actual: ${actual ?? 'none'}`)
  }
}

/**
 * Thrown when a member cannot be found in the organization
 */
export class MemberNotFoundError extends OrganizationDomainError {
  constructor(public readonly memberId: string) {
    super(`Member not found: ${memberId}`)
  }
}

/**
 * Thrown when an admin attempts to modify owner roles
 */
export class CannotModifyOwnerError extends OrganizationDomainError {
  constructor() {
    super('Admins cannot modify owner roles')
  }
}

/**
 * Thrown when attempting to remove or demote the last owner
 */
export class CannotRemoveLastOwnerError extends OrganizationDomainError {
  constructor() {
    super('Cannot remove last owner')
  }
}

/**
 * Thrown when an invitation is invalid, expired, or already used
 */
export class InvalidInvitationError extends OrganizationDomainError {
  constructor(public readonly reason: 'not_found' | 'expired' | 'already_used') {
    super(`Invalid invitation: ${reason}`)
  }
}

/**
 * Thrown when the user's email doesn't match the invitation email
 */
export class InvitationEmailMismatchError extends OrganizationDomainError {
  constructor(
    public readonly expected: string,
    public readonly actual: string
  ) {
    super('Email does not match invitation')
  }
}

/**
 * Thrown when attempting to invite a user who is already a member
 */
export class UserAlreadyMemberError extends OrganizationDomainError {
  constructor(public readonly email: string) {
    super(`User is already a member: ${email}`)
  }
}
