import { PrismaPg } from '@prisma/adapter-pg'
import * as argon2 from 'argon2'
import { v4 as uuidv4 } from 'uuid'

import { PrismaClient } from '../libs/database/src/generated/prisma/client'

/**
 * Comprehensive E2E Seed Script
 *
 * This script populates the database with realistic test data for E2E testing,
 * including multiple users, organizations, projects, workflow runs, and stories.
 *
 * Test Credentials:
 * - admin@vyrak.dev / Password123! (Owner of Acme Corp)
 * - john@vyrak.dev / Password123! (Admin of Acme Corp)
 * - jane@vyrak.dev / Password123! (Member of Startup Inc)
 * - alice@vyrak.dev / Password123! (Owner of Tech Startup)
 * - bob@vyrak.dev / Password123! (Member of Tech Startup)
 *
 * Organization Hierarchy:
 * - Acme Corporation (active, 2 users)
 * - Startup Inc (active, 1 user)
 * - Tech Startup (active, 2 users)
 * - Inactive Corp (inactive, 0 members)
 */

const databaseUrl = process.env.DATABASE__URL || 'postgresql://postgres:postgres@localhost:5433/vyrak'

const adapter = new PrismaPg({
  connectionString: databaseUrl,
})

const prisma = new PrismaClient({ adapter })

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate Argon2id password hash
 */
async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  })
}

// UUID generation handled by uuidv4() import

// ============================================================================
// Main Seed Function
// ============================================================================

async function main() {
  try {
    console.log('🌱 E2E Seed: Starting database population...\n')

    // Hash password for all test users
    const password = 'Password123!'
    const passwordHash = await hashPassword(password)
    console.log('🔐 Password hash generated')

    // ========================================================================
    // 1. Clear Existing Data (respect FK constraints)
    // ========================================================================
    console.log('\n📋 Step 1: Clearing existing data...')

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

    console.log('✅ Database cleared')

    // ========================================================================
    // 2. Create Users (5 users total)
    // ========================================================================
    console.log('\n📋 Step 2: Creating users...')

    const users = await Promise.all([
      prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'admin@vyrak.dev',
          name: 'Admin User',
          emailVerified: true,
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'john@vyrak.dev',
          name: 'John Doe',
          emailVerified: true,
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'jane@vyrak.dev',
          name: 'Jane Smith',
          emailVerified: true,
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'alice@vyrak.dev',
          name: 'Alice Johnson',
          emailVerified: true,
          passwordHash,
        },
      }),
      prisma.user.create({
        data: {
          id: uuidv4(),
          email: 'bob@vyrak.dev',
          name: 'Bob Wilson',
          emailVerified: true,
          passwordHash,
        },
      }),
    ])

    const [adminUser, johnUser, janeUser, aliceUser, bobUser] = users
    console.log(`✅ Created ${users.length} users`)

    // ========================================================================
    // 3. Create Organizations (4 organizations)
    // ========================================================================
    console.log('\n📋 Step 3: Creating organizations...')

    const orgs = await Promise.all([
      prisma.organization.create({
        data: {
          id: uuidv4(),
          name: 'Acme Corporation',
          slug: 'acme-corp',
          logo: null,
          metadata: JSON.stringify({
            industry: 'Technology',
            size: 'Enterprise',
            country: 'Vietnam',
          }),
        },
      }),
      prisma.organization.create({
        data: {
          id: uuidv4(),
          name: 'Startup Inc',
          slug: 'startup-inc',
          logo: null,
          metadata: JSON.stringify({
            industry: 'SaaS',
            size: 'Startup',
            country: 'Vietnam',
          }),
        },
      }),
      prisma.organization.create({
        data: {
          id: uuidv4(),
          name: 'Tech Startup',
          slug: 'tech-startup',
          logo: null,
          metadata: JSON.stringify({
            industry: 'AI/ML',
            size: 'Scale-up',
            country: 'Vietnam',
          }),
        },
      }),
      prisma.organization.create({
        data: {
          id: uuidv4(),
          name: 'Inactive Corp',
          slug: 'inactive-corp',
          logo: null,
          metadata: JSON.stringify({
            industry: 'Finance',
            size: 'Enterprise',
            status: 'inactive',
            country: 'Vietnam',
          }),
        },
      }),
    ])

    const [acmeOrg, startupOrg, techOrg] = orgs
    // inactiveOrg (4th org) exists in DB but not used in seed relationships
    console.log(`✅ Created ${orgs.length} organizations`)

    // ========================================================================
    // 4. Create Organization Members
    // ========================================================================
    console.log('\n📋 Step 4: Creating organization members...')

    await Promise.all([
      // Acme Corporation members
      prisma.member.create({
        data: {
          id: uuidv4(),
          userId: adminUser.id,
          organizationId: acmeOrg.id,
          role: 'owner',
        },
      }),
      prisma.member.create({
        data: {
          id: uuidv4(),
          userId: johnUser.id,
          organizationId: acmeOrg.id,
          role: 'admin',
        },
      }),

      // Startup Inc members
      prisma.member.create({
        data: {
          id: uuidv4(),
          userId: janeUser.id,
          organizationId: startupOrg.id,
          role: 'owner',
        },
      }),

      // Tech Startup members
      prisma.member.create({
        data: {
          id: uuidv4(),
          userId: aliceUser.id,
          organizationId: techOrg.id,
          role: 'owner',
        },
      }),
      prisma.member.create({
        data: {
          id: uuidv4(),
          userId: bobUser.id,
          organizationId: techOrg.id,
          role: 'member',
        },
      }),
    ])

    console.log('✅ Created organization members with roles')

    // ========================================================================
    // 5. Create Projects
    // ========================================================================
    console.log('\n📋 Step 5: Creating projects...')

    const projects = await Promise.all([
      // Acme Corporation projects
      prisma.project.create({
        data: {
          id: uuidv4(),
          organizationId: acmeOrg.id,
          name: 'Web Platform',
          slug: 'web-platform',
          description: 'Main customer-facing web platform',
        },
      }),
      prisma.project.create({
        data: {
          id: uuidv4(),
          organizationId: acmeOrg.id,
          name: 'Mobile App',
          slug: 'mobile-app',
          description: 'iOS and Android mobile applications',
        },
      }),
      prisma.project.create({
        data: {
          id: uuidv4(),
          organizationId: acmeOrg.id,
          name: 'Backend API',
          slug: 'backend-api',
          description: 'Core backend services and APIs',
        },
      }),

      // Startup Inc projects
      prisma.project.create({
        data: {
          id: uuidv4(),
          organizationId: startupOrg.id,
          name: 'SaaS Dashboard',
          slug: 'saas-dashboard',
          description: 'Main SaaS application dashboard',
        },
      }),
      prisma.project.create({
        data: {
          id: uuidv4(),
          organizationId: startupOrg.id,
          name: 'Analytics Engine',
          slug: 'analytics-engine',
          description: 'Data analytics and reporting engine',
        },
      }),

      // Tech Startup projects
      prisma.project.create({
        data: {
          id: uuidv4(),
          organizationId: techOrg.id,
          name: 'AI Model Server',
          slug: 'ai-model-server',
          description: 'Production ML model serving',
        },
      }),
      prisma.project.create({
        data: {
          id: uuidv4(),
          organizationId: techOrg.id,
          name: 'Data Pipeline',
          slug: 'data-pipeline',
          description: 'ETL and data processing pipeline',
        },
      }),
    ])

    console.log(`✅ Created ${projects.length} projects`)

    // ========================================================================
    // 6. Create Git Repositories
    // ========================================================================
    console.log('\n📋 Step 6: Creating git repositories...')

    const repos = await Promise.all([
      // Acme projects
      prisma.gitRepository.create({
        data: {
          id: uuidv4(),
          projectId: projects[0].id,
          organizationId: acmeOrg.id,
          name: 'vyrak-web',
          url: 'https://github.com/acme/vyrak-web',
          branch: 'main',
          provider: 'github',
          status: 'active',
        },
      }),
      prisma.gitRepository.create({
        data: {
          id: uuidv4(),
          projectId: projects[0].id,
          organizationId: acmeOrg.id,
          name: 'vyrak-web-staging',
          url: 'https://github.com/acme/vyrak-web-staging',
          branch: 'develop',
          provider: 'github',
          status: 'active',
        },
      }),
      prisma.gitRepository.create({
        data: {
          id: uuidv4(),
          projectId: projects[1].id,
          organizationId: acmeOrg.id,
          name: 'mobile-ios',
          url: 'https://github.com/acme/mobile-ios',
          branch: 'main',
          provider: 'github',
          status: 'active',
        },
      }),
      prisma.gitRepository.create({
        data: {
          id: uuidv4(),
          projectId: projects[2].id,
          organizationId: acmeOrg.id,
          name: 'vyrak-api',
          url: 'https://github.com/acme/vyrak-api',
          branch: 'develop',
          provider: 'github',
          status: 'active',
        },
      }),

      // Startup projects
      prisma.gitRepository.create({
        data: {
          id: uuidv4(),
          projectId: projects[3].id,
          organizationId: startupOrg.id,
          name: 'saas-dashboard',
          url: 'https://github.com/startup/saas-dashboard',
          branch: 'main',
          provider: 'github',
          status: 'active',
        },
      }),
      prisma.gitRepository.create({
        data: {
          id: uuidv4(),
          projectId: projects[4].id,
          organizationId: startupOrg.id,
          name: 'analytics-engine',
          url: 'https://github.com/startup/analytics-engine',
          branch: 'main',
          provider: 'github',
          status: 'active',
        },
      }),

      // Tech Startup projects
      prisma.gitRepository.create({
        data: {
          id: uuidv4(),
          projectId: projects[5].id,
          organizationId: techOrg.id,
          name: 'ai-model-server',
          url: 'https://github.com/techstartup/ai-model-server',
          branch: 'main',
          provider: 'github',
          status: 'active',
        },
      }),
      prisma.gitRepository.create({
        data: {
          id: uuidv4(),
          projectId: projects[6].id,
          organizationId: techOrg.id,
          name: 'data-pipeline',
          url: 'https://github.com/techstartup/data-pipeline',
          branch: 'main',
          provider: 'github',
          status: 'active',
        },
      }),
    ])

    console.log(`✅ Created ${repos.length} git repositories`)

    // ========================================================================
    // 7. Create Workflow Runs with Different Statuses
    // ========================================================================
    console.log('\n📋 Step 7: Creating workflow runs...')

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

    const workflowRuns = await Promise.all([
      // RUNNING workflow
      prisma.workflowRun.create({
        data: {
          id: uuidv4(),
          projectId: projects[0].id,
          organizationId: acmeOrg.id,
          initiatedByUserId: adminUser.id,
          workflowKey: 'feature',
          workflowVersion: '1.0.0',
          status: 'running',
          state: 'running',
          idempotencyKey: uuidv4(),
          startedAt: oneHourAgo,
          input: {
            requirement: 'Build comprehensive user authentication with OAuth integration',
          },
          totalStories: 4,
          completedStories: 1,
          failedStories: 0,
        },
      }),

      // COMPLETED workflow
      prisma.workflowRun.create({
        data: {
          id: uuidv4(),
          projectId: projects[0].id,
          organizationId: acmeOrg.id,
          initiatedByUserId: johnUser.id,
          workflowKey: 'feature',
          workflowVersion: '1.0.0',
          status: 'completed',
          state: 'completed',
          idempotencyKey: uuidv4(),
          startedAt: twoDaysAgo,
          completedAt: new Date(twoDaysAgo.getTime() + 45 * 60 * 1000),
          input: {
            requirement: 'Integrate Stripe payment gateway',
          },
          totalStories: 3,
          completedStories: 3,
          failedStories: 0,
          result: JSON.stringify({
            success: true,
            pullRequestUrl: 'https://github.com/acme/vyrak-web/pull/123',
          }),
        },
      }),

      // FAILED workflow
      prisma.workflowRun.create({
        data: {
          id: uuidv4(),
          projectId: projects[0].id,
          organizationId: acmeOrg.id,
          initiatedByUserId: adminUser.id,
          workflowKey: 'hotfix',
          workflowVersion: '1.0.0',
          status: 'failed',
          state: 'failed',
          idempotencyKey: uuidv4(),
          startedAt: oneDayAgo,
          completedAt: new Date(oneDayAgo.getTime() + 20 * 60 * 1000),
          input: {
            requirement: 'Fix critical login bug',
          },
          totalStories: 1,
          completedStories: 0,
          failedStories: 1,
          errorCode: 'TEST_FAILURE',
          errorMessage: 'Test suite failed: 3 tests failing',
          result: JSON.stringify({
            success: false,
            failedTests: ['should login', 'should reset password'],
          }),
        },
      }),

      // QUEUED workflow
      prisma.workflowRun.create({
        data: {
          id: uuidv4(),
          projectId: projects[1].id,
          organizationId: acmeOrg.id,
          initiatedByUserId: johnUser.id,
          workflowKey: 'feature',
          workflowVersion: '1.0.0',
          status: 'queued',
          state: 'pending',
          idempotencyKey: uuidv4(),
          input: {
            requirement: 'Implement real-time chat with WebSocket',
          },
          totalStories: 5,
          completedStories: 0,
          failedStories: 0,
        },
      }),

      // CANCELLED workflow
      prisma.workflowRun.create({
        data: {
          id: uuidv4(),
          projectId: projects[1].id,
          organizationId: acmeOrg.id,
          initiatedByUserId: johnUser.id,
          workflowKey: 'feature',
          workflowVersion: '1.0.0',
          status: 'cancelled',
          state: 'cancelled',
          idempotencyKey: uuidv4(),
          startedAt: threeHoursAgo,
          completedAt: twoHoursAgo,
          input: {
            requirement: 'Add dashboard analytics',
          },
          totalStories: 3,
          completedStories: 1,
          failedStories: 0,
          cancelledByUserId: adminUser.id,
          cancelledAt: twoHoursAgo,
          cancellationReason: 'Project priority changed',
        },
      }),

      // Startup Inc workflows
      prisma.workflowRun.create({
        data: {
          id: uuidv4(),
          projectId: projects[3].id,
          organizationId: startupOrg.id,
          initiatedByUserId: janeUser.id,
          workflowKey: 'feature',
          workflowVersion: '1.0.0',
          status: 'completed',
          state: 'completed',
          idempotencyKey: uuidv4(),
          startedAt: oneDayAgo,
          completedAt: new Date(oneDayAgo.getTime() + 60 * 60 * 1000),
          input: {
            requirement: 'Add user profile management',
          },
          totalStories: 4,
          completedStories: 4,
          failedStories: 0,
        },
      }),

      // Tech Startup workflows
      prisma.workflowRun.create({
        data: {
          id: uuidv4(),
          projectId: projects[5].id,
          organizationId: techOrg.id,
          initiatedByUserId: aliceUser.id,
          workflowKey: 'feature',
          workflowVersion: '1.0.0',
          status: 'waiting_approval',
          state: 'waiting_approval',
          idempotencyKey: uuidv4(),
          startedAt: twoHoursAgo,
          input: {
            requirement: 'Deploy new ML model version',
          },
          totalStories: 2,
          completedStories: 1,
          failedStories: 0,
        },
      }),

      prisma.workflowRun.create({
        data: {
          id: uuidv4(),
          projectId: projects[6].id,
          organizationId: techOrg.id,
          initiatedByUserId: bobUser.id,
          workflowKey: 'hotfix',
          workflowVersion: '1.0.0',
          status: 'running',
          state: 'running',
          idempotencyKey: uuidv4(),
          startedAt: new Date(now.getTime() - 30 * 60 * 1000),
          input: {
            requirement: 'Fix data pipeline memory leak',
          },
          totalStories: 1,
          completedStories: 0,
          failedStories: 0,
        },
      }),
    ])

    console.log(`✅ Created ${workflowRuns.length} workflow runs`)

    // ========================================================================
    // 8. Create Stories (Task-based substeps in workflows)
    // ========================================================================
    console.log('\n📋 Step 8: Creating workflow stories...')

    const stories = await prisma.story.createMany({
      data: [
        // Running workflow stories
        {
          id: uuidv4(),
          workflowRunId: workflowRuns[0].id,
          orderIndex: 1,
          title: 'Setup Authentication Module',
          description: 'Create authentication module with JWT support',
          acceptanceCriteria: JSON.stringify([
            'JWT token generation works',
            'Token validation works',
            'Token refresh works',
          ]),
          estimatedDuration: 30,
          status: 'completed',
          startedAt: oneHourAgo,
          completedAt: new Date(oneHourAgo.getTime() + 30 * 60 * 1000),
          duration: 30,
          artifacts: JSON.stringify({
            files: ['auth.service.ts', 'jwt.strategy.ts'],
            linesAdded: 250,
          }),
        },
        {
          id: uuidv4(),
          workflowRunId: workflowRuns[0].id,
          orderIndex: 2,
          title: 'Implement OAuth Integration',
          description: 'Add Google and GitHub OAuth providers',
          acceptanceCriteria: JSON.stringify(['Google OAuth works', 'GitHub OAuth works', 'Token exchange works']),
          estimatedDuration: 45,
          status: 'running',
          startedAt: new Date(oneHourAgo.getTime() + 30 * 60 * 1000),
          artifacts: JSON.stringify({ progress: '70%' }),
        },
        {
          id: uuidv4(),
          workflowRunId: workflowRuns[0].id,
          orderIndex: 3,
          title: 'Add Email Verification',
          description: 'Setup email verification flow',
          estimatedDuration: 20,
          status: 'queued',
        },
        {
          id: uuidv4(),
          workflowRunId: workflowRuns[0].id,
          orderIndex: 4,
          title: 'Password Reset Functionality',
          description: 'Implement password reset with email confirmation',
          estimatedDuration: 25,
          status: 'queued',
        },

        // Completed workflow stories
        {
          id: uuidv4(),
          workflowRunId: workflowRuns[1].id,
          orderIndex: 1,
          title: 'Stripe Integration Setup',
          description: 'Configure Stripe API and webhooks',
          status: 'completed',
          startedAt: twoDaysAgo,
          completedAt: new Date(twoDaysAgo.getTime() + 15 * 60 * 1000),
          duration: 15,
        },
        {
          id: uuidv4(),
          workflowRunId: workflowRuns[1].id,
          orderIndex: 2,
          title: 'Payment Processing',
          description: 'Implement payment processing logic',
          status: 'completed',
          startedAt: new Date(twoDaysAgo.getTime() + 15 * 60 * 1000),
          completedAt: new Date(twoDaysAgo.getTime() + 35 * 60 * 1000),
          duration: 20,
        },
        {
          id: uuidv4(),
          workflowRunId: workflowRuns[1].id,
          orderIndex: 3,
          title: 'Invoice Generation',
          description: 'Add invoice generation and emailing',
          status: 'completed',
          startedAt: new Date(twoDaysAgo.getTime() + 35 * 60 * 1000),
          completedAt: new Date(twoDaysAgo.getTime() + 45 * 60 * 1000),
          duration: 10,
        },

        // Failed workflow stories
        {
          id: uuidv4(),
          workflowRunId: workflowRuns[2].id,
          orderIndex: 1,
          title: 'Fix Login Session Bug',
          description: 'Fix session token mismatch in login flow',
          status: 'failed',
          startedAt: oneDayAgo,
          completedAt: new Date(oneDayAgo.getTime() + 20 * 60 * 1000),
          duration: 20,
          error: JSON.stringify({
            message: 'Test failure: session token validation failed',
            failedTests: 3,
          }),
        },

        // Startup Inc workflow stories
        {
          id: uuidv4(),
          workflowRunId: workflowRuns[5].id,
          orderIndex: 1,
          title: 'User Profile Schema',
          description: 'Design user profile database schema',
          status: 'completed',
          startedAt: oneDayAgo,
          completedAt: new Date(oneDayAgo.getTime() + 15 * 60 * 1000),
          duration: 15,
        },
        {
          id: uuidv4(),
          workflowRunId: workflowRuns[5].id,
          orderIndex: 2,
          title: 'Profile API Endpoints',
          description: 'Implement profile CRUD endpoints',
          status: 'completed',
          startedAt: new Date(oneDayAgo.getTime() + 15 * 60 * 1000),
          completedAt: new Date(oneDayAgo.getTime() + 40 * 60 * 1000),
          duration: 25,
        },
        {
          id: uuidv4(),
          workflowRunId: workflowRuns[5].id,
          orderIndex: 3,
          title: 'Profile UI Components',
          description: 'Build React components for profile',
          status: 'completed',
          startedAt: new Date(oneDayAgo.getTime() + 40 * 60 * 1000),
          completedAt: new Date(oneDayAgo.getTime() + 50 * 60 * 1000),
          duration: 10,
        },
        {
          id: uuidv4(),
          workflowRunId: workflowRuns[5].id,
          orderIndex: 4,
          title: 'Avatar Upload Feature',
          description: 'Add user avatar upload functionality',
          status: 'completed',
          startedAt: new Date(oneDayAgo.getTime() + 50 * 60 * 1000),
          completedAt: new Date(oneDayAgo.getTime() + 60 * 60 * 1000),
          duration: 10,
        },

        // Tech Startup workflow stories
        {
          id: uuidv4(),
          workflowRunId: workflowRuns[6].id,
          orderIndex: 1,
          title: 'Model Validation',
          description: 'Validate new model performance',
          status: 'completed',
          startedAt: twoHoursAgo,
          completedAt: new Date(twoHoursAgo.getTime() + 30 * 60 * 1000),
          duration: 30,
        },
        {
          id: uuidv4(),
          workflowRunId: workflowRuns[6].id,
          orderIndex: 2,
          title: 'Model Deployment',
          description: 'Deploy model to production',
          status: 'queued',
          estimatedDuration: 45,
        },

        // Data Pipeline workflow stories
        {
          id: uuidv4(),
          workflowRunId: workflowRuns[7].id,
          orderIndex: 1,
          title: 'Identify Memory Leak',
          description: 'Diagnose memory leak in pipeline',
          status: 'running',
          startedAt: new Date(now.getTime() - 30 * 60 * 1000),
          artifacts: JSON.stringify({ progress: '80%', findings: 2 }),
        },
      ],
    })

    console.log(`✅ Created ${stories.count} workflow stories`)

    // ========================================================================
    // 9. Create Workflow Step Runs
    // ========================================================================
    console.log('\n📋 Step 9: Creating workflow step runs...')

    const stepRuns = await Promise.all([
      // Running workflow steps
      prisma.workflowStepRun.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[0].id,
          organizationId: acmeOrg.id,
          stepKey: 'planning',
          phaseKey: 'planning',
          stepType: 'planning',
          status: 'completed',
          requiresApproval: false,
          completedStoryIds: JSON.stringify([]),
          output: JSON.stringify({
            ard: 'Architecture requirements documented',
            storyCount: 4,
          }),
          startedAt: oneHourAgo,
          completedAt: new Date(oneHourAgo.getTime() + 10 * 60 * 1000),
        },
      }),
      prisma.workflowStepRun.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[0].id,
          organizationId: acmeOrg.id,
          stepKey: 'implementation',
          phaseKey: 'implementation',
          stepType: 'implementation',
          status: 'running',
          requiresApproval: false,
          completedStoryIds: JSON.stringify(['1']),
          output: JSON.stringify({
            currentStory: 2,
            storiesCompleted: 1,
            progress: '70%',
          }),
          startedAt: new Date(oneHourAgo.getTime() + 10 * 60 * 1000),
        },
      }),
      prisma.workflowStepRun.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[0].id,
          organizationId: acmeOrg.id,
          stepKey: 'review',
          phaseKey: 'review',
          stepType: 'review',
          status: 'pending',
          requiresApproval: true,
          completedStoryIds: JSON.stringify([]),
        },
      }),
      prisma.workflowStepRun.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[0].id,
          organizationId: acmeOrg.id,
          stepKey: 'qa',
          phaseKey: 'qa',
          stepType: 'qa',
          status: 'pending',
          requiresApproval: true,
          completedStoryIds: JSON.stringify([]),
        },
      }),

      // Completed workflow steps
      prisma.workflowStepRun.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[1].id,
          organizationId: acmeOrg.id,
          stepKey: 'planning',
          phaseKey: 'planning',
          stepType: 'planning',
          status: 'completed',
          completedStoryIds: JSON.stringify([]),
          startedAt: twoDaysAgo,
          completedAt: new Date(twoDaysAgo.getTime() + 8 * 60 * 1000),
          output: JSON.stringify({ stories: 3 }),
        },
      }),
      prisma.workflowStepRun.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[1].id,
          organizationId: acmeOrg.id,
          stepKey: 'implementation',
          phaseKey: 'implementation',
          stepType: 'implementation',
          status: 'completed',
          completedStoryIds: JSON.stringify(['1', '2', '3']),
          startedAt: new Date(twoDaysAgo.getTime() + 8 * 60 * 1000),
          completedAt: new Date(twoDaysAgo.getTime() + 30 * 60 * 1000),
          output: JSON.stringify({ filesModified: 12, linesAdded: 450 }),
        },
      }),
      prisma.workflowStepRun.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[1].id,
          organizationId: acmeOrg.id,
          stepKey: 'review',
          phaseKey: 'review',
          stepType: 'review',
          status: 'completed',
          completedStoryIds: JSON.stringify([]),
          startedAt: new Date(twoDaysAgo.getTime() + 30 * 60 * 1000),
          completedAt: new Date(twoDaysAgo.getTime() + 38 * 60 * 1000),
          output: JSON.stringify({ findings: 0, approved: true }),
        },
      }),
      prisma.workflowStepRun.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[1].id,
          organizationId: acmeOrg.id,
          stepKey: 'qa',
          phaseKey: 'qa',
          stepType: 'qa',
          status: 'completed',
          completedStoryIds: JSON.stringify([]),
          startedAt: new Date(twoDaysAgo.getTime() + 38 * 60 * 1000),
          completedAt: new Date(twoDaysAgo.getTime() + 45 * 60 * 1000),
          output: JSON.stringify({ testsPassed: 24, coverage: '95%' }),
        },
      }),

      // Failed workflow steps
      prisma.workflowStepRun.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[2].id,
          organizationId: acmeOrg.id,
          stepKey: 'bug_analysis',
          phaseKey: 'bug_analysis',
          stepType: 'bug_analysis',
          status: 'completed',
          completedStoryIds: JSON.stringify([]),
          startedAt: oneDayAgo,
          completedAt: new Date(oneDayAgo.getTime() + 5 * 60 * 1000),
          output: JSON.stringify({
            rootCause: 'Session token format mismatch',
          }),
        },
      }),
      prisma.workflowStepRun.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[2].id,
          organizationId: acmeOrg.id,
          stepKey: 'implementation',
          phaseKey: 'implementation',
          stepType: 'implementation',
          status: 'completed',
          completedStoryIds: JSON.stringify(['1']),
          startedAt: new Date(oneDayAgo.getTime() + 5 * 60 * 1000),
          completedAt: new Date(oneDayAgo.getTime() + 12 * 60 * 1000),
          output: JSON.stringify({ filesModified: 2, testsAdded: 3 }),
        },
      }),
      prisma.workflowStepRun.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[2].id,
          organizationId: acmeOrg.id,
          stepKey: 'fast_review',
          phaseKey: 'fast_review',
          stepType: 'fast_review',
          status: 'failed',
          requiresApproval: true,
          completedStoryIds: JSON.stringify([]),
          startedAt: new Date(oneDayAgo.getTime() + 12 * 60 * 1000),
          completedAt: new Date(oneDayAgo.getTime() + 20 * 60 * 1000),
          errorCode: 'TEST_FAILURE',
          errorMessage: 'Test suite failed: 3 tests failing in auth.spec.ts',
          output: JSON.stringify({
            failedTests: ['should login with valid credentials', 'should reset password successfully'],
          }),
        },
      }),

      // Additional failed steps with different error types
      prisma.workflowStepRun.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[2].id,
          organizationId: acmeOrg.id,
          stepKey: 'database_migration',
          phaseKey: 'database',
          stepType: 'migration',
          status: 'failed',
          attempt: 2,
          completedStoryIds: JSON.stringify([]),
          startedAt: new Date(oneDayAgo.getTime() - 60 * 60 * 1000),
          completedAt: new Date(oneDayAgo.getTime() - 55 * 60 * 1000),
          errorCode: 'DATABASE_ERROR',
          errorMessage: 'Connection timeout: Unable to connect to PostgreSQL database after 30 seconds',
          output: JSON.stringify({
            host: 'db.production.example.com',
            port: 5432,
            retries: 3,
            lastError: 'ETIMEDOUT',
          }),
        },
      }),
      prisma.workflowStepRun.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[7].id,
          organizationId: techOrg.id,
          stepKey: 'build',
          phaseKey: 'build',
          stepType: 'build',
          status: 'failed',
          attempt: 1,
          completedStoryIds: JSON.stringify([]),
          startedAt: new Date(now.getTime() - 45 * 60 * 1000),
          completedAt: new Date(now.getTime() - 40 * 60 * 1000),
          errorCode: 'BUILD_FAILURE',
          errorMessage: 'TypeScript compilation failed with 5 errors in src/pipeline/processor.ts',
          output: JSON.stringify({
            errors: [
              "TS2304: Cannot find name 'ProcessorConfig'",
              "TS2339: Property 'batchSize' does not exist on type 'Config'",
              "TS2345: Argument of type 'string' is not assignable to parameter of type 'number'",
            ],
            exitCode: 1,
          }),
        },
      }),
      prisma.workflowStepRun.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[4].id,
          organizationId: acmeOrg.id,
          stepKey: 'deployment',
          phaseKey: 'deployment',
          stepType: 'deployment',
          status: 'failed',
          attempt: 1,
          completedStoryIds: JSON.stringify([]),
          startedAt: new Date(threeHoursAgo.getTime() + 30 * 60 * 1000),
          completedAt: new Date(threeHoursAgo.getTime() + 35 * 60 * 1000),
          errorCode: 'DEPLOYMENT_ERROR',
          errorMessage:
            'Kubernetes deployment failed: ImagePullBackOff - Failed to pull image "acme/mobile-app:v2.3.1"',
          output: JSON.stringify({
            namespace: 'production',
            deployment: 'mobile-app',
            error: 'Failed to pull image',
            reason: 'ImagePullBackOff',
            message: 'Back-off pulling image "acme/mobile-app:v2.3.1"',
          }),
        },
      }),
    ])

    console.log(
      `✅ Created ${stepRuns.length} workflow step runs (including ${stepRuns.filter((s) => s.status === 'failed').length} failed steps)`
    )

    // ========================================================================
    // 10. Create Workflow Approvals
    // ========================================================================
    console.log('\n📋 Step 10: Creating workflow approvals...')

    const approvals = await Promise.all([
      // Completed workflow approval
      prisma.workflowApproval.create({
        data: {
          id: uuidv4(),
          organizationId: acmeOrg.id,
          workflowRunId: workflowRuns[1].id,
          status: 'approved',
          planArtifactId: uuidv4(),
          planArtifactHash: 'hash123abc',
          decidedByUserId: adminUser.id,
          decidedAt: new Date(twoDaysAgo.getTime() + 8 * 60 * 1000),
          comment: 'Looks good! ARD is comprehensive and well-structured.',
        },
      }),

      // Waiting approval workflow approval
      prisma.workflowApproval.create({
        data: {
          id: uuidv4(),
          organizationId: techOrg.id,
          workflowRunId: workflowRuns[6].id,
          status: 'pending',
          planArtifactId: uuidv4(),
          planArtifactHash: 'hash456def',
        },
      }),
    ])

    console.log(`✅ Created ${approvals.length} workflow approvals`)

    // ========================================================================
    // 11. Create Workflow Events (Event Stream)
    // ========================================================================
    console.log('\n📋 Step 11: Creating workflow events...')

    const events = await Promise.all([
      // Running workflow events
      prisma.workflowEvent.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[0].id,
          organizationId: acmeOrg.id,
          stepRunId: stepRuns[0].id,
          sequence: 1,
          eventType: 'step_started',
          payload: JSON.stringify({
            stepKey: 'planning',
            timestamp: oneHourAgo.toISOString(),
          }),
        },
      }),
      prisma.workflowEvent.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[0].id,
          organizationId: acmeOrg.id,
          stepRunId: stepRuns[0].id,
          sequence: 2,
          eventType: 'step_completed',
          payload: JSON.stringify({
            stepKey: 'planning',
            duration: 600,
          }),
        },
      }),
      prisma.workflowEvent.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[0].id,
          organizationId: acmeOrg.id,
          stepRunId: stepRuns[1].id,
          sequence: 3,
          eventType: 'step_started',
          payload: JSON.stringify({
            stepKey: 'implementation',
          }),
        },
      }),

      // Completed workflow events
      prisma.workflowEvent.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[1].id,
          organizationId: acmeOrg.id,
          sequence: 1,
          eventType: 'workflow_started',
          payload: JSON.stringify({
            workflowKey: 'feature',
          }),
        },
      }),
      prisma.workflowEvent.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[1].id,
          organizationId: acmeOrg.id,
          sequence: 2,
          eventType: 'workflow_completed',
          payload: JSON.stringify({
            workflowKey: 'feature',
            duration: 2700,
            status: 'success',
          }),
        },
      }),
    ])

    console.log(`✅ Created ${events.length} workflow events`)

    // ========================================================================
    // 12. Create Artifacts (Generated files from workflows)
    // ========================================================================
    console.log('\n📋 Step 12: Creating artifacts...')

    const artifacts = await Promise.all([
      prisma.artifact.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[1].id,
          organizationId: acmeOrg.id,
          filePath: 'ARD.md',
          s3Bucket: 'vyrak-artifacts',
          s3Key: `${acmeOrg.id}/${workflowRuns[1].id}/ARD.md`,
          contentSize: Buffer.byteLength(
            '# Architecture Requirements Document\n\n## Payment Integration\n\n...',
            'utf-8'
          ),
          contentType: 'text/plain',
        },
      }),
      prisma.artifact.create({
        data: {
          id: uuidv4(),
          runId: workflowRuns[0].id,
          organizationId: acmeOrg.id,
          filePath: 'IMPLEMENTATION_PLAN.md',
          s3Bucket: 'vyrak-artifacts',
          s3Key: `${acmeOrg.id}/${workflowRuns[0].id}/IMPLEMENTATION_PLAN.md`,
          contentSize: Buffer.byteLength('# Implementation Plan\n\n## Phase 1: Authentication\n\n...', 'utf-8'),
          contentType: 'text/plain',
        },
      }),
    ])

    console.log(`✅ Created ${artifacts.length} artifacts`)

    // ========================================================================
    // 13. Create Audit Logs
    // ========================================================================
    console.log('\n📋 Step 13: Creating audit logs...')

    const auditLogs = await prisma.auditLog.createMany({
      data: [
        {
          id: uuidv4(),
          organizationId: acmeOrg.id,
          userId: adminUser.id,
          event: 'workflow.started',
          action: 'create',
          resource: 'workflow_run',
          resourceId: workflowRuns[0].id,
          ipAddress: '127.0.0.1',
          userAgent: 'E2E Test',
        },
        {
          id: uuidv4(),
          organizationId: acmeOrg.id,
          userId: johnUser.id,
          event: 'workflow.started',
          action: 'create',
          resource: 'workflow_run',
          resourceId: workflowRuns[1].id,
          ipAddress: '127.0.0.1',
          userAgent: 'E2E Test',
        },
        {
          id: uuidv4(),
          organizationId: acmeOrg.id,
          userId: adminUser.id,
          event: 'workflow.cancelled',
          action: 'update',
          resource: 'workflow_run',
          resourceId: workflowRuns[2].id,
          ipAddress: '127.0.0.1',
          userAgent: 'E2E Test',
        },
      ],
    })

    console.log(`✅ Created ${auditLogs.count} audit logs`)

    // ========================================================================
    // Summary & Test Credentials
    // ========================================================================
    console.log('\n' + '='.repeat(70))
    console.log('✅ E2E SEED COMPLETED SUCCESSFULLY')
    console.log('='.repeat(70))

    console.log('\n📝 TEST CREDENTIALS:')
    console.log('   Primary User:')
    console.log('      Email: admin@vyrak.dev')
    console.log('      Password: Password123!')
    console.log('      Role: Owner of Acme Corporation')
    console.log('\n   Additional Test Users:')
    console.log('      john@vyrak.dev / Password123! (Admin at Acme)')
    console.log('      jane@vyrak.dev / Password123! (Owner at Startup Inc)')
    console.log('      alice@vyrak.dev / Password123! (Owner at Tech Startup)')
    console.log('      bob@vyrak.dev / Password123! (Member at Tech Startup)')

    console.log('\n📊 DATA SUMMARY:')
    console.log(`   Users: ${users.length}`)
    console.log(`   Organizations: ${orgs.length}`)
    console.log(`   Projects: ${projects.length}`)
    console.log(`   Repositories: ${repos.length}`)
    console.log(`   Workflow Runs: ${workflowRuns.length}`)
    console.log(`   Stories: ${stories.count}`)
    console.log(`   Step Runs: ${stepRuns.length}`)
    console.log(`   Workflow Events: ${events.length}`)
    console.log(`   Artifacts: ${artifacts.length}`)
    console.log(`   Audit Logs: ${auditLogs.count}`)

    console.log('\n🎯 WORKFLOW STATUS DISTRIBUTION:')
    console.log('   Running: 2')
    console.log('   Completed: 3')
    console.log('   Failed: 1')
    console.log('   Cancelled: 1')
    console.log('   Queued: 1')
    console.log('   Waiting Approval: 1')

    console.log('\n📍 TESTING COVERAGE:')
    console.log('   ✓ Dashboard: Multiple orgs with varying stats')
    console.log('   ✓ Projects: Different states across organizations')
    console.log('   ✓ Workflows: All status types (running, completed, failed, etc)')
    console.log('   ✓ Authentication: Test user with known credentials')
    console.log('   ✓ Real-time: Workflow events for streaming')
    console.log('   ✓ Approvals: Pending and approved workflows')
    console.log('   ✓ Access Control: Multiple roles (owner, admin, member)')

    console.log('\n✨ Ready for E2E testing!')
    console.log('='.repeat(70) + '\n')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
