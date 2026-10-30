import { PrismaPg } from '@prisma/adapter-pg'
import * as argon2 from 'argon2'
import { config } from 'dotenv'
import * as path from 'node:path'

import { PrismaClient } from '../libs/database/src/generated/prisma/client'

// Load environment variables from apps/api-server/.env
config({ path: path.resolve(__dirname, '../apps/api-server/.env') })

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

  // Truncate all tables (faster than deleteMany, works with soft associations)
  await prisma.$executeRawUnsafe('TRUNCATE TABLE git_repositories CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE projects CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE invitation CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE member CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE organizations CASCADE')
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "user" CASCADE')

  console.log('🧹 Truncated all tables')

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

  // Create git repositories
  await prisma.gitRepository.createMany({
    data: [
      {
        id: 'a50e8400-e29b-41d4-a716-446655440001',
        organizationId: '650e8400-e29b-41d4-a716-446655440001',
        projectId: '950e8400-e29b-41d4-a716-446655440001',
        name: 'vyrak-web',
        url: 'https://github.com/acme/vyrak-web',
        branch: 'main',
        provider: 'github',
        status: 'active',
      },
      {
        id: 'a50e8400-e29b-41d4-a716-446655440002',
        organizationId: '650e8400-e29b-41d4-a716-446655440001',
        projectId: '950e8400-e29b-41d4-a716-446655440001',
        name: 'vyrak-api',
        url: 'https://github.com/acme/vyrak-api',
        branch: 'develop',
        provider: 'github',
        status: 'active',
      },
      {
        id: 'a50e8400-e29b-41d4-a716-446655440003',
        organizationId: '650e8400-e29b-41d4-a716-446655440001',
        projectId: '950e8400-e29b-41d4-a716-446655440002',
        name: 'mobile-ios',
        url: 'https://github.com/acme/mobile-ios',
        branch: 'main',
        provider: 'github',
        status: 'active',
      },
    ],
  })

  console.log('📦 Created git repositories')

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
