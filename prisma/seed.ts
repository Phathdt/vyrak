import { PrismaPg } from '@prisma/adapter-pg'

import * as argon2 from 'argon2'

import { PrismaClient } from '../libs/database/src/generated/prisma/client'

const databaseUrl = process.env.DATABASE__URL || 'postgresql://postgres:postgres@localhost:5433/vyrak'

const adapter = new PrismaPg({
  connectionString: databaseUrl,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Generate Argon2id hash for password "Password123!"
  const password = 'Password123!'
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  })

  console.log('🔐 Password hash generated')

  // Clear existing data
  await prisma.auditLog.deleteMany()
  await prisma.agentTask.deleteMany()
  await prisma.artifact.deleteMany()
  await prisma.workflowRun.deleteMany()
  await prisma.gitRepository.deleteMany()
  await prisma.project.deleteMany()
  await prisma.product.deleteMany()
  await prisma.member.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()

  console.log('🧹 Cleared existing data')

  // Create users with UUID
  const users = await Promise.all([
    prisma.user.create({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'admin@vyrak.dev',
        name: 'Admin User',
        emailVerified: true,
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'john@vyrak.dev',
        name: 'John Doe',
        emailVerified: true,
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        id: '550e8400-e29b-41d4-a716-446655440003',
        email: 'jane@vyrak.dev',
        name: 'Jane Smith',
        emailVerified: true,
        passwordHash,
      },
    }),
  ])

  console.log(`👥 Created ${users.length} users`)

  // Create organizations with UUID
  const orgs = await Promise.all([
    prisma.organization.create({
      data: {
        id: '650e8400-e29b-41d4-a716-446655440001',
        name: 'Acme Corporation',
        slug: 'acme-corp',
        metadata: JSON.stringify({ industry: 'Technology', size: 'Enterprise' }),
      },
    }),
    prisma.organization.create({
      data: {
        id: '650e8400-e29b-41d4-a716-446655440002',
        name: 'Startup Inc',
        slug: 'startup-inc',
        metadata: JSON.stringify({ industry: 'SaaS', size: 'Startup' }),
      },
    }),
  ])

  console.log(`🏢 Created ${orgs.length} organizations`)

  // Create memberships with UUID
  await Promise.all([
    prisma.member.create({
      data: {
        id: '750e8400-e29b-41d4-a716-446655440001',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        organizationId: '650e8400-e29b-41d4-a716-446655440001',
        role: 'owner',
      },
    }),
    prisma.member.create({
      data: {
        id: '750e8400-e29b-41d4-a716-446655440002',
        userId: '550e8400-e29b-41d4-a716-446655440002',
        organizationId: '650e8400-e29b-41d4-a716-446655440001',
        role: 'admin',
      },
    }),
    prisma.member.create({
      data: {
        id: '750e8400-e29b-41d4-a716-446655440003',
        userId: '550e8400-e29b-41d4-a716-446655440002',
        organizationId: '650e8400-e29b-41d4-a716-446655440002',
        role: 'owner',
      },
    }),
    prisma.member.create({
      data: {
        id: '750e8400-e29b-41d4-a716-446655440004',
        userId: '550e8400-e29b-41d4-a716-446655440003',
        organizationId: '650e8400-e29b-41d4-a716-446655440002',
        role: 'member',
      },
    }),
  ])

  console.log('🤝 Created memberships')

  // Create products with UUID
  await prisma.product.createMany({
    data: [
      {
        id: '850e8400-e29b-41d4-a716-446655440001',
        organizationId: '650e8400-e29b-41d4-a716-446655440001',
        name: 'Premium Laptop',
        description: 'High-performance laptop for professionals',
        price: 1299.99,
        stock: 50,
      },
      {
        id: '850e8400-e29b-41d4-a716-446655440002',
        organizationId: '650e8400-e29b-41d4-a716-446655440001',
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse with precision tracking',
        price: 49.99,
        stock: 200,
      },
      {
        id: '850e8400-e29b-41d4-a716-446655440003',
        organizationId: '650e8400-e29b-41d4-a716-446655440001',
        name: 'Mechanical Keyboard',
        description: 'RGB mechanical keyboard with Cherry MX switches',
        price: 159.99,
        stock: 100,
      },
      {
        id: '850e8400-e29b-41d4-a716-446655440004',
        organizationId: '650e8400-e29b-41d4-a716-446655440002',
        name: 'SaaS Starter Plan',
        description: 'Monthly subscription for small teams',
        price: 29.99,
        stock: 999,
      },
    ],
  })

  console.log('📦 Created products')

  // Create projects with UUID
  await prisma.project.createMany({
    data: [
      {
        id: '950e8400-e29b-41d4-a716-446655440001',
        organizationId: '650e8400-e29b-41d4-a716-446655440001',
        name: 'Web Platform',
        slug: 'web-platform',
        description: 'Main customer-facing web platform',
      },
      {
        id: '950e8400-e29b-41d4-a716-446655440002',
        organizationId: '650e8400-e29b-41d4-a716-446655440001',
        name: 'Mobile App',
        slug: 'mobile-app',
        description: 'iOS and Android mobile applications',
      },
    ],
  })

  console.log('🚀 Created projects')

  console.log('\n✅ Seed completed!')
  console.log('\n📝 Test credentials:')
  console.log('   Email: admin@vyrak.dev')
  console.log('   Password: Password123!')
  console.log('   User ID: 550e8400-e29b-41d4-a716-446655440001')
  console.log('   Org ID: 650e8400-e29b-41d4-a716-446655440001')
  console.log('\n   Other test users:')
  console.log('   - john@vyrak.dev / Password123!')
  console.log('   - jane@vyrak.dev / Password123!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
