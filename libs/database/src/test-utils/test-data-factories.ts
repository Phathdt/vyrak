import type { Member, Organization, User } from '../generated/prisma/client'

/**
 * Factory functions for creating test data with sensible defaults.
 * Override any fields by passing them in the input.
 */

let userCounter = 0
let orgCounter = 0

export function resetCounters() {
  userCounter = 0
  orgCounter = 0
}

export function createTestUser(override: Partial<User> = {}): Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
  userCounter++
  return {
    email: `test-user-${userCounter}@example.com`,
    name: `Test User ${userCounter}`,
    emailVerified: false,
    image: null,
    ...override,
  }
}

export function createTestOrganization(
  override: Partial<Organization> = {}
): Omit<Organization, 'id' | 'createdAt' | 'updatedAt'> {
  orgCounter++
  return {
    name: `Test Organization ${orgCounter}`,
    slug: `test-org-${orgCounter}`,
    logo: null,
    metadata: null,
    ...override,
  }
}

export function createTestOrganizationMember(
  override: Partial<Member> = {}
): Omit<Member, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    organizationId: 'org-id',
    userId: 'user-id',
    role: 'member',
    ...override,
  }
}

/**
 * Helper to create a full organization with owner member in one transaction.
 */
export async function createTestOrgWithOwner(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  userId: string,
  orgData: Partial<Organization> = {}
) {
  const orgInput = createTestOrganization(orgData)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await prisma.$transaction(async (tx: any) => {
    // Create organization
    const org = await tx.organization.create({
      data: orgInput,
    })

    // Create owner membership
    await tx.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: userId,
        role: 'owner',
      },
    })

    return org
  })
}
