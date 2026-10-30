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
      initiatedByUserId: '550e8400-e29b-41d4-a716-446655440001',
      workflowKey: 'feature',
      workflowVersion: '1.0.0',
      status: 'running',
      state: 'running',
      idempotencyKey: 'a50e8400-e29b-41d4-a716-446655440001',
      startedAt: oneHourAgo,
      input: JSON.stringify({
        requirement:
          'Build a comprehensive user authentication system with email verification, password reset, and OAuth integration (Google, GitHub)',
      }),
      totalStories: 3,
      completedStories: 2,
      failedStories: 0,
    },
    {
      id: 'b50e8400-e29b-41d4-a716-446655440002',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      projectId: '950e8400-e29b-41d4-a716-446655440001',
      initiatedByUserId: '550e8400-e29b-41d4-a716-446655440002',
      workflowKey: 'feature',
      workflowVersion: '1.0.0',
      status: 'succeeded',
      state: 'succeeded',
      idempotencyKey: 'a50e8400-e29b-41d4-a716-446655440002',
      startedAt: oneDayAgo,
      completedAt: new Date(oneDayAgo.getTime() + 45 * 60 * 1000),
      input: JSON.stringify({
        requirement:
          'Integrate Stripe payment gateway with subscription management, invoice generation, and webhook handling for payment events',
      }),
      totalStories: 4,
      completedStories: 4,
      failedStories: 0,
    },
    {
      id: 'b50e8400-e29b-41d4-a716-446655440003',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      projectId: '950e8400-e29b-41d4-a716-446655440001',
      initiatedByUserId: '550e8400-e29b-41d4-a716-446655440001',
      workflowKey: 'hotfix',
      workflowVersion: '1.0.0',
      status: 'failed',
      state: 'failed',
      idempotencyKey: 'a50e8400-e29b-41d4-a716-446655440003',
      startedAt: twoHoursAgo,
      completedAt: new Date(twoHoursAgo.getTime() + 15 * 60 * 1000),
      input: JSON.stringify({
        requirement: 'Fix critical bug: users cannot login after password reset due to session token mismatch',
      }),
      errorCode: 'TEST_FAILURE',
      errorMessage: 'Test suite failed: 3 tests failing in auth.spec.ts',
      totalStories: 1,
      completedStories: 0,
      failedStories: 1,
    },
    {
      id: 'b50e8400-e29b-41d4-a716-446655440004',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      projectId: '950e8400-e29b-41d4-a716-446655440002',
      initiatedByUserId: '550e8400-e29b-41d4-a716-446655440003',
      workflowKey: 'feature',
      workflowVersion: '1.0.0',
      status: 'queued',
      state: 'queued',
      idempotencyKey: 'a50e8400-e29b-41d4-a716-446655440004',
      input: JSON.stringify({
        requirement: 'Implement real-time chat feature with WebSocket support, message history, and file attachments',
      }),
      totalStories: 5,
      completedStories: 0,
      failedStories: 0,
    },
    {
      id: 'b50e8400-e29b-41d4-a716-446655440005',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      projectId: '950e8400-e29b-41d4-a716-446655440001',
      initiatedByUserId: '550e8400-e29b-41d4-a716-446655440001',
      workflowKey: 'feature',
      workflowVersion: '1.0.0',
      status: 'cancelled',
      state: 'cancelled',
      idempotencyKey: 'a50e8400-e29b-41d4-a716-446655440005',
      startedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
      input: JSON.stringify({
        requirement:
          'Create analytics dashboard with charts, metrics, and export functionality for business intelligence',
      }),
      cancelledByUserId: '550e8400-e29b-41d4-a716-446655440001',
      cancelledAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
      cancellationReason: 'Requirements changed, switching to different analytics provider',
      totalStories: 3,
      completedStories: 1,
      failedStories: 0,
    },
  ]

  for (const run of workflowRuns) {
    await prisma.workflowRun.create({ data: run })
  }

  console.log(`🔄 Created ${workflowRuns.length} workflow runs`)

  // Create workflow step runs
  const stepRuns = [
    // Steps for running workflow (b50e8400-e29b-41d4-a716-446655440001)
    {
      id: 'c50e8400-e29b-41d4-a716-446655440001',
      runId: 'b50e8400-e29b-41d4-a716-446655440001',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      stepKey: 'planning',
      phaseKey: 'planning',
      stepType: 'phase',
      status: 'succeeded',
      attempt: 1,
      requiresApproval: true,
      startedAt: oneHourAgo,
      completedAt: new Date(oneHourAgo.getTime() + 8 * 60 * 1000),
      input: JSON.stringify({ requirement: 'Build user authentication system' }),
      output: JSON.stringify({ ardGenerated: true, storiesCount: 3 }),
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440002',
      runId: 'b50e8400-e29b-41d4-a716-446655440001',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      stepKey: 'implementation',
      phaseKey: 'implementation',
      stepType: 'phase',
      status: 'running',
      attempt: 1,
      requiresApproval: false,
      startedAt: new Date(oneHourAgo.getTime() + 10 * 60 * 1000),
      completedStoryIds: JSON.stringify(['story-1', 'story-2']),
      currentStoryId: 'story-3',
      input: JSON.stringify({ stories: ['story-1', 'story-2', 'story-3'] }),
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440003',
      runId: 'b50e8400-e29b-41d4-a716-446655440001',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      stepKey: 'review',
      phaseKey: 'review',
      stepType: 'phase',
      status: 'pending',
      attempt: 1,
      requiresApproval: true,
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440004',
      runId: 'b50e8400-e29b-41d4-a716-446655440001',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      stepKey: 'qa',
      phaseKey: 'qa',
      stepType: 'phase',
      status: 'pending',
      attempt: 1,
      requiresApproval: true,
    },
    // Steps for succeeded workflow (b50e8400-e29b-41d4-a716-446655440002)
    {
      id: 'c50e8400-e29b-41d4-a716-446655440005',
      runId: 'b50e8400-e29b-41d4-a716-446655440002',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      stepKey: 'planning',
      phaseKey: 'planning',
      stepType: 'phase',
      status: 'succeeded',
      attempt: 1,
      requiresApproval: true,
      startedAt: oneDayAgo,
      completedAt: new Date(oneDayAgo.getTime() + 7 * 60 * 1000),
      input: JSON.stringify({ requirement: 'Stripe payment integration' }),
      output: JSON.stringify({ ardGenerated: true, storiesCount: 4 }),
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440006',
      runId: 'b50e8400-e29b-41d4-a716-446655440002',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      stepKey: 'implementation',
      phaseKey: 'implementation',
      stepType: 'phase',
      status: 'succeeded',
      attempt: 1,
      requiresApproval: false,
      startedAt: new Date(oneDayAgo.getTime() + 10 * 60 * 1000),
      completedAt: new Date(oneDayAgo.getTime() + 30 * 60 * 1000),
      completedStoryIds: JSON.stringify(['story-1', 'story-2', 'story-3', 'story-4']),
      input: JSON.stringify({ stories: ['story-1', 'story-2', 'story-3', 'story-4'] }),
      output: JSON.stringify({ implementedStories: 4 }),
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440007',
      runId: 'b50e8400-e29b-41d4-a716-446655440002',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      stepKey: 'review',
      phaseKey: 'review',
      stepType: 'phase',
      status: 'succeeded',
      attempt: 1,
      requiresApproval: true,
      startedAt: new Date(oneDayAgo.getTime() + 32 * 60 * 1000),
      completedAt: new Date(oneDayAgo.getTime() + 38 * 60 * 1000),
      output: JSON.stringify({ issuesFound: 2, securityScore: 95 }),
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440008',
      runId: 'b50e8400-e29b-41d4-a716-446655440002',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      stepKey: 'qa',
      phaseKey: 'qa',
      stepType: 'phase',
      status: 'succeeded',
      attempt: 1,
      requiresApproval: true,
      startedAt: new Date(oneDayAgo.getTime() + 40 * 60 * 1000),
      completedAt: new Date(oneDayAgo.getTime() + 45 * 60 * 1000),
      output: JSON.stringify({ testsPassed: 47, testsFailed: 0, coverage: 92 }),
    },
    // Steps for failed workflow (b50e8400-e29b-41d4-a716-446655440003)
    {
      id: 'c50e8400-e29b-41d4-a716-446655440009',
      runId: 'b50e8400-e29b-41d4-a716-446655440003',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      stepKey: 'bug_analysis',
      phaseKey: 'bug_analysis',
      stepType: 'phase',
      status: 'succeeded',
      attempt: 1,
      requiresApproval: false,
      startedAt: twoHoursAgo,
      completedAt: new Date(twoHoursAgo.getTime() + 4 * 60 * 1000),
      input: JSON.stringify({ bugDescription: 'Login issue after password reset' }),
      output: JSON.stringify({ rootCause: 'Session token mismatch' }),
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440010',
      runId: 'b50e8400-e29b-41d4-a716-446655440003',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      stepKey: 'implementation',
      phaseKey: 'implementation',
      stepType: 'phase',
      status: 'succeeded',
      attempt: 1,
      requiresApproval: false,
      startedAt: new Date(twoHoursAgo.getTime() + 5 * 60 * 1000),
      completedAt: new Date(twoHoursAgo.getTime() + 10 * 60 * 1000),
      output: JSON.stringify({ fileChanged: 'auth/session.ts' }),
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440011',
      runId: 'b50e8400-e29b-41d4-a716-446655440003',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      stepKey: 'fast_review',
      phaseKey: 'fast_review',
      stepType: 'phase',
      status: 'failed',
      attempt: 1,
      requiresApproval: true,
      startedAt: new Date(twoHoursAgo.getTime() + 12 * 60 * 1000),
      completedAt: new Date(twoHoursAgo.getTime() + 15 * 60 * 1000),
      errorCode: 'TEST_FAILURE',
      errorMessage: 'Test suite failed: 3 tests failing in auth.spec.ts',
      output: JSON.stringify({ testsPassed: 12, testsFailed: 3 }),
    },
    // Steps for cancelled workflow (b50e8400-e29b-41d4-a716-446655440005)
    {
      id: 'c50e8400-e29b-41d4-a716-446655440012',
      runId: 'b50e8400-e29b-41d4-a716-446655440005',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      stepKey: 'planning',
      phaseKey: 'planning',
      stepType: 'phase',
      status: 'succeeded',
      attempt: 1,
      requiresApproval: true,
      startedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 2.8 * 60 * 60 * 1000),
      input: JSON.stringify({ requirement: 'Analytics dashboard' }),
      output: JSON.stringify({ ardGenerated: true, storiesCount: 3 }),
    },
    {
      id: 'c50e8400-e29b-41d4-a716-446655440013',
      runId: 'b50e8400-e29b-41d4-a716-446655440005',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      stepKey: 'implementation',
      phaseKey: 'implementation',
      stepType: 'phase',
      status: 'cancelled',
      attempt: 1,
      requiresApproval: false,
      startedAt: new Date(now.getTime() - 2.7 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
      completedStoryIds: JSON.stringify(['story-1']),
      currentStoryId: 'story-2',
    },
  ]

  for (const stepRun of stepRuns) {
    await prisma.workflowStepRun.create({ data: stepRun })
  }

  console.log(`📊 Created ${stepRuns.length} workflow step runs`)

  // Create artifacts with S3 storage (Epic 16)
  const artifacts = [
    {
      id: 'd50e8400-e29b-41d4-a716-446655440001',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      runId: 'b50e8400-e29b-41d4-a716-446655440001',
      filePath: 'architecture-requirements.md',
      s3Bucket: 'vyrak-artifacts',
      s3Key: '650e8400-e29b-41d4-a716-446655440001/b50e8400-e29b-41d4-a716-446655440001/architecture-requirements.md',
      contentSize: 2543,
      contentType: 'text/markdown',
    },
    {
      id: 'd50e8400-e29b-41d4-a716-446655440002',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      runId: 'b50e8400-e29b-41d4-a716-446655440001',
      filePath: 'story-breakdown.json',
      s3Bucket: 'vyrak-artifacts',
      s3Key: '650e8400-e29b-41d4-a716-446655440001/b50e8400-e29b-41d4-a716-446655440001/story-breakdown.json',
      contentSize: 1024,
      contentType: 'application/json',
    },
    {
      id: 'd50e8400-e29b-41d4-a716-446655440003',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      runId: 'b50e8400-e29b-41d4-a716-446655440002',
      filePath: 'payment-system-design.md',
      s3Bucket: 'vyrak-artifacts',
      s3Key: '650e8400-e29b-41d4-a716-446655440001/b50e8400-e29b-41d4-a716-446655440002/payment-system-design.md',
      contentSize: 3891,
      contentType: 'text/markdown',
    },
    {
      id: 'd50e8400-e29b-41d4-a716-446655440004',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      runId: 'b50e8400-e29b-41d4-a716-446655440002',
      filePath: 'code-review-report.md',
      s3Bucket: 'vyrak-artifacts',
      s3Key: '650e8400-e29b-41d4-a716-446655440001/b50e8400-e29b-41d4-a716-446655440002/code-review-report.md',
      contentSize: 1567,
      contentType: 'text/markdown',
    },
    {
      id: 'd50e8400-e29b-41d4-a716-446655440005',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      runId: 'b50e8400-e29b-41d4-a716-446655440002',
      filePath: 'test-results.json',
      s3Bucket: 'vyrak-artifacts',
      s3Key: '650e8400-e29b-41d4-a716-446655440001/b50e8400-e29b-41d4-a716-446655440002/test-results.json',
      contentSize: 892,
      contentType: 'application/json',
    },
    {
      id: 'd50e8400-e29b-41d4-a716-446655440006',
      organizationId: '650e8400-e29b-41d4-a716-446655440001',
      runId: 'b50e8400-e29b-41d4-a716-446655440003',
      filePath: 'bug-analysis.md',
      s3Bucket: 'vyrak-artifacts',
      s3Key: '650e8400-e29b-41d4-a716-446655440001/b50e8400-e29b-41d4-a716-446655440003/bug-analysis.md',
      contentSize: 712,
      contentType: 'text/markdown',
    },
  ]

  for (const artifact of artifacts) {
    await prisma.artifact.create({ data: artifact })
  }

  console.log(`📦 Created ${artifacts.length} artifacts with S3 storage`)

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
