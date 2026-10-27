import type { Member, Organization, PrismaClient, Project, User } from '../generated/prisma/client'

/**
 * Factory functions for creating test data with sensible defaults.
 * Override any fields by passing them in the input.
 */

let userCounter = 0
let orgCounter = 0
let projectCounter = 0

export function resetCounters() {
  userCounter = 0
  orgCounter = 0
  projectCounter = 0
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  prisma: PrismaClient,
  override: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>> = {}
): Promise<User> {
  userCounter++
  return await prisma.user.create({
    data: {
      email: `test-user-${userCounter}@example.com`,
      name: `Test User ${userCounter}`,
      emailVerified: false,
      image: null,
      ...override,
    },
  })
}

/**
 * Create a test organization in the database
 */
export async function createTestOrganization(
  prisma: PrismaClient,
  override: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>> = {}
): Promise<Organization> {
  orgCounter++
  return await prisma.organization.create({
    data: {
      name: `Test Organization ${orgCounter}`,
      slug: `test-org-${orgCounter}`,
      logo: null,
      metadata: null,
      ...override,
    },
  })
}

/**
 * Create a test member relationship
 */
export async function createTestMember(
  prisma: PrismaClient,
  data: { organizationId: string; userId: string; role?: 'owner' | 'admin' | 'member' }
): Promise<Member> {
  return await prisma.member.create({
    data: {
      organizationId: data.organizationId,
      userId: data.userId,
      role: data.role ?? 'member',
    },
  })
}

/**
 * Helper to create a full organization with owner member in one transaction.
 * If user is not provided, creates a new user.
 */
export async function createTestOrgWithOwner(
  prisma: PrismaClient,
  user?: User,
  orgData: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>> = {}
): Promise<{ user: User; organization: Organization; member: Member }> {
  return await prisma.$transaction(async (tx) => {
    // Create user if not provided
    const owner = user ?? (await createTestUser(tx as PrismaClient))

    // Create organization
    orgCounter++
    const organization = await tx.organization.create({
      data: {
        name: `Test Organization ${orgCounter}`,
        slug: `test-org-${orgCounter}`,
        logo: null,
        metadata: null,
        ...orgData,
      },
    })

    // Create owner membership
    const member = await tx.member.create({
      data: {
        organizationId: organization.id,
        userId: owner.id,
        role: 'owner',
      },
    })

    return { user: owner, organization, member }
  })
}

/**
 * Create a test project in the database
 */
export async function createTestProject(
  prisma: PrismaClient,
  organizationId: string,
  override: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'organizationId'>> = {}
): Promise<Project> {
  projectCounter++
  return await prisma.project.create({
    data: {
      organizationId,
      name: `Test Project ${projectCounter}`,
      slug: `test-project-${projectCounter}`,
      description: null,
      settings: null,
      ...override,
    },
  })
}
