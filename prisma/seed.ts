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

  // Create git repositories
  await prisma.gitRepository.createMany({
    data: [
      {
        id: 'a50e8400-e29b-41d4-a716-446655440001',
        organizationId: '650e8400-e29b-41d4-a716-446655440001',
        projectId: '950e8400-e29b-41d4-a716-446655440001',
        name: 'vyrak-web',
        provider: 'github',
        providerUrl: 'https://github.com/acme/vyrak-web',
        defaultBranch: 'main',
        status: 'active',
      },
      {
        id: 'a50e8400-e29b-41d4-a716-446655440002',
        organizationId: '650e8400-e29b-41d4-a716-446655440001',
        projectId: '950e8400-e29b-41d4-a716-446655440001',
        name: 'vyrak-api',
        provider: 'github',
        providerUrl: 'https://github.com/acme/vyrak-api',
        defaultBranch: 'develop',
        status: 'active',
      },
      {
        id: 'a50e8400-e29b-41d4-a716-446655440003',
        organizationId: '650e8400-e29b-41d4-a716-446655440001',
        projectId: '950e8400-e29b-41d4-a716-446655440002',
        name: 'mobile-ios',
        provider: 'github',
        providerUrl: 'https://github.com/acme/mobile-ios',
        defaultBranch: 'main',
        status: 'active',
      },
    ],
  })

  console.log('📦 Created git repositories')

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

  // Create workflow runs with different statuses
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const workflowRuns = [
    {
      id: 'b50e8400-e29b-41d4-a716-446655440001',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      projectId: '950e8400-e29b-41d4-a716-446655440001',
      repositoryId: 'a50e8400-e29b-41d4-a716-446655440001',
      initiatorId: '550e8400-e29b-41d4-a716-446655440001',
      workflowKey: 'feature',
      branch: 'main',
      requirement: 'Build a comprehensive user authentication system with email verification, password reset, and OAuth integration (Google, GitHub)',
      status: 'running' as const,
      startedAt: oneHourAgo,
      idempotencyKey: 'idempotency-key-001',
    },
    {
      id: 'b50e8400-e29b-41d4-a716-446655440002',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      projectId: '950e8400-e29b-41d4-a716-446655440001',
      repositoryId: 'a50e8400-e29b-41d4-a716-446655440001',
      initiatorId: '550e8400-e29b-41d4-a716-446655440002',
      workflowKey: 'feature',
      branch: 'feature/payment-integration',
      requirement: 'Integrate Stripe payment gateway with subscription management, invoice generation, and webhook handling for payment events',
      status: 'completed' as const,
      startedAt: oneDayAgo,
      completedAt: new Date(oneDayAgo.getTime() + 45 * 60 * 1000),
      idempotencyKey: 'idempotency-key-002',
    },
    {
      id: 'b50e8400-e29b-41d4-a716-446655440003',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      projectId: '950e8400-e29b-41d4-a716-446655440001',
      repositoryId: 'a50e8400-e29b-41d4-a716-446655440002',
      initiatorId: '550e8400-e29b-41d4-a716-446655440001',
      workflowKey: 'hotfix',
      branch: 'hotfix/login-bug',
      requirement: 'Fix critical bug: users cannot login after password reset due to session token mismatch',
      status: 'failed' as const,
      startedAt: twoHoursAgo,
      completedAt: new Date(twoHoursAgo.getTime() + 15 * 60 * 1000),
      error: JSON.stringify({
        message: 'Test suite failed: 3 tests failing in auth.spec.ts',
        code: 'TEST_FAILURE',
      }),
      idempotencyKey: 'idempotency-key-003',
    },
    {
      id: 'b50e8400-e29b-41d4-a716-446655440004',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      projectId: '950e8400-e29b-41d4-a716-446655440002',
      repositoryId: 'a50e8400-e29b-41d4-a716-446655440003',
      initiatorId: '550e8400-e29b-41d4-a716-446655440003',
      workflowKey: 'feature',
      branch: 'develop',
      requirement: 'Implement real-time chat feature with WebSocket support, message history, and file attachments',
      status: 'queued' as const,
      startedAt: null,
      idempotencyKey: 'idempotency-key-004',
    },
    {
      id: 'b50e8400-e29b-41d4-a716-446655440005',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      projectId: '950e8400-e29b-41d4-a716-446655440001',
      repositoryId: 'a50e8400-e29b-41d4-a716-446655440001',
      initiatorId: '550e8400-e29b-41d4-a716-446655440001',
      workflowKey: 'feature',
      branch: 'feature/dashboard-analytics',
      requirement: 'Create analytics dashboard with charts, metrics, and export functionality for business intelligence',
      status: 'cancelled' as const,
      startedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
      idempotencyKey: 'idempotency-key-005',
    },
  ]

  for (const run of workflowRuns) {
    await prisma.workflowRun.create({ data: run })
  }

  console.log(`🔄 Created ${workflowRuns.length} workflow runs`)

  // Create workflow steps for the running workflow
  const runningWorkflowId = 'b50e8400-e29b-41d4-a716-446655440001'

  const steps = [
    {
      id: 'c50e8400-e29b-41d4-a716-446655440001',
      workflowRunId: runningWorkflowId,
      name: 'Planning',
      description: 'Generate ARD and stories breakdown',
      order: 1,
      status: 'completed' as const,
      startedAt: oneHourAgo,
      completedAt: new Date(oneHourAgo.getTime() + 10 * 60 * 1000),
      output: JSON.stringify({
        ard: 'Architecture requirements document generated',
        stories: ['Story 1: User registration', 'Story 2: Email verification', 'Story 3: OAuth integration'],
      }),
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440002',
      workflowRunId: runningWorkflowId,
      name: 'Implementation',
      description: 'Execute stories sequentially',
      order: 2,
      status: 'running' as const,
      startedAt: new Date(oneHourAgo.getTime() + 10 * 60 * 1000),
      output: JSON.stringify({
        currentStory: 'Story 2: Email verification',
        progress: '66%',
      }),
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440003',
      workflowRunId: runningWorkflowId,
      name: 'Review',
      description: 'Code review and security scan',
      order: 3,
      status: 'pending' as const,
      startedAt: null,
      completedAt: null,
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440004',
      workflowRunId: runningWorkflowId,
      name: 'QA',
      description: 'Run tests and validation',
      order: 4,
      status: 'pending' as const,
      startedAt: null,
      completedAt: null,
    },
  ]

  for (const step of steps) {
    await prisma.workflowStepRun.create({ data: step })
  }

  console.log(`📊 Created ${steps.length} workflow steps`)

  // Create workflow steps for the completed workflow
  const completedWorkflowId = 'b50e8400-e29b-41d4-a716-446655440002'

  const completedSteps = [
    {
      id: 'c50e8400-e29b-41d4-a716-446655440005',
      workflowRunId: completedWorkflowId,
      name: 'Planning',
      description: 'Generate ARD and stories breakdown',
      order: 1,
      status: 'completed' as const,
      startedAt: oneDayAgo,
      completedAt: new Date(oneDayAgo.getTime() + 8 * 60 * 1000),
      output: JSON.stringify({ ard: 'Payment system architecture', stories: 4 }),
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440006',
      workflowRunId: completedWorkflowId,
      name: 'Implementation',
      description: 'Execute stories sequentially',
      order: 2,
      status: 'completed' as const,
      startedAt: new Date(oneDayAgo.getTime() + 8 * 60 * 1000),
      completedAt: new Date(oneDayAgo.getTime() + 30 * 60 * 1000),
      output: JSON.stringify({ storiesCompleted: 4, filesModified: 12 }),
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440007',
      workflowRunId: completedWorkflowId,
      name: 'Review',
      description: 'Code review and security scan',
      order: 3,
      status: 'completed' as const,
      startedAt: new Date(oneDayAgo.getTime() + 30 * 60 * 1000),
      completedAt: new Date(oneDayAgo.getTime() + 38 * 60 * 1000),
      output: JSON.stringify({ findings: 0, approved: true }),
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440008',
      workflowRunId: completedWorkflowId,
      name: 'QA',
      description: 'Run tests and validation',
      order: 4,
      status: 'completed' as const,
      startedAt: new Date(oneDayAgo.getTime() + 38 * 60 * 1000),
      completedAt: new Date(oneDayAgo.getTime() + 45 * 60 * 1000),
      output: JSON.stringify({ testsPassed: 24, coverage: '95%' }),
    },
  ]

  for (const step of completedSteps) {
    await prisma.workflowStepRun.create({ data: step })
  }

  console.log(`📊 Created ${completedSteps.length} completed workflow steps`)

  // Create workflow steps for the failed workflow
  const failedWorkflowId = 'b50e8400-e29b-41d4-a716-446655440003'

  const failedSteps = [
    {
      id: 'c50e8400-e29b-41d4-a716-446655440009',
      workflowRunId: failedWorkflowId,
      name: 'Bug Analysis',
      description: 'Reproduce bug and identify root cause',
      order: 1,
      status: 'completed' as const,
      startedAt: twoHoursAgo,
      completedAt: new Date(twoHoursAgo.getTime() + 5 * 60 * 1000),
      output: JSON.stringify({ rootCause: 'Session token format mismatch in auth middleware' }),
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440010',
      workflowRunId: failedWorkflowId,
      name: 'Implementation',
      description: 'Fix code and add regression test',
      order: 2,
      status: 'completed' as const,
      startedAt: new Date(twoHoursAgo.getTime() + 5 * 60 * 1000),
      completedAt: new Date(twoHoursAgo.getTime() + 12 * 60 * 1000),
      output: JSON.stringify({ filesModified: 2, testsAdded: 3 }),
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440011',
      workflowRunId: failedWorkflowId,
      name: 'Fast Review',
      description: 'Quick security and correctness check',
      order: 3,
      status: 'failed' as const,
      startedAt: new Date(twoHoursAgo.getTime() + 12 * 60 * 1000),
      completedAt: new Date(twoHoursAgo.getTime() + 15 * 60 * 1000),
      error: JSON.stringify({
        message: 'Test suite failed: 3 tests failing in auth.spec.ts',
        tests: [
          'should login with valid credentials',
          'should reset password successfully',
          'should maintain session after password reset',
        ],
      }),
    },
  ]

  for (const step of failedSteps) {
    await prisma.workflowStepRun.create({ data: step })
  }

  console.log(`📊 Created ${failedSteps.length} failed workflow steps`)

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
