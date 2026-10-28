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

  // Clear existing data (order matters due to foreign keys)
  await prisma.auditLog.deleteMany()
  await prisma.workflowApproval.deleteMany()
  await prisma.workflowEvent.deleteMany()
  await prisma.workflowStepRun.deleteMany()
  await prisma.story.deleteMany()
  await prisma.agentTask.deleteMany()
  await prisma.artifact.deleteMany()
  await prisma.workflowRun.deleteMany()
  await prisma.gitRepository.deleteMany()
  await prisma.project.deleteMany()
  await prisma.invitation.deleteMany()
  await prisma.member.deleteMany()
  await prisma.organization.deleteMany()
  await prisma.user.deleteMany()
  await prisma.workflowTemplate.deleteMany()

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

  // Create workflow templates
  const templates = [
    {
      key: 'feature',
      name: 'Feature (AI SDLC)',
      description: 'Build new features with full AI software development lifecycle',
      icon: '🎯',
      isActive: true,
      storyBased: true,
      phases: [
        {
          key: 'planning',
          name: 'Planning',
          description: 'Generate ARD and stories breakdown',
          icon: '📋',
          order: 1,
          estimatedDurationMin: 5,
          estimatedDurationMax: 10,
          requiresApproval: true,
          approvalMessage: 'Review ARD and stories before implementation',
        },
        {
          key: 'implementation',
          name: 'Implementation',
          description: 'Execute stories sequentially',
          icon: '💻',
          order: 2,
          estimatedDurationMin: 20,
          estimatedDurationMax: 60,
          requiresApproval: false,
        },
        {
          key: 'review',
          name: 'Review',
          description: 'Code review and security scan',
          icon: '👀',
          order: 3,
          estimatedDurationMin: 5,
          estimatedDurationMax: 10,
          requiresApproval: true,
          approvalMessage: 'Review code changes and security findings',
        },
        {
          key: 'qa',
          name: 'QA',
          description: 'Run tests and validation',
          icon: '✅',
          order: 4,
          estimatedDurationMin: 10,
          estimatedDurationMax: 20,
          requiresApproval: true,
          approvalMessage: 'Review test results before deployment',
        },
      ],
      estimatedDurationMin: 30,
      estimatedDurationMax: 90,
    },
    {
      key: 'hotfix',
      name: 'Hotfix (Fast-Track)',
      description: 'Quick bug fixes without full planning cycle',
      icon: '🔥',
      isActive: true,
      storyBased: false,
      phases: [
        {
          key: 'bug_analysis',
          name: 'Bug Analysis',
          description: 'Reproduce bug and identify root cause',
          icon: '🐛',
          order: 1,
          estimatedDurationMin: 2,
          estimatedDurationMax: 5,
          requiresApproval: false,
        },
        {
          key: 'implementation',
          name: 'Implementation',
          description: 'Fix code and add regression test',
          icon: '💻',
          order: 2,
          estimatedDurationMin: 5,
          estimatedDurationMax: 15,
          requiresApproval: false,
        },
        {
          key: 'fast_review',
          name: 'Fast Review',
          description: 'Quick security and correctness check',
          icon: '⚡',
          order: 3,
          estimatedDurationMin: 2,
          estimatedDurationMax: 5,
          requiresApproval: true,
          approvalMessage: 'Review hotfix before deployment',
        },
      ],
      estimatedDurationMin: 10,
      estimatedDurationMax: 25,
    },
  ]

  for (const template of templates) {
    await prisma.workflowTemplate.upsert({
      where: { key: template.key },
      update: template,
      create: template,
    })
    console.log(`📝 Template "${template.name}" seeded`)
  }

  console.log('✅ Created workflow templates')

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
