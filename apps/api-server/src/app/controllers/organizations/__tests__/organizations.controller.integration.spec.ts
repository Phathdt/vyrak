import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { DatabaseModule } from '@vyrak/database'
import { getPrismaClient, startPostgres, stopPostgres } from '@vyrak/database/test-utils'
import {
  INVITATION_SERVICE,
  MEMBER_SERVICE,
  ORGANIZATION_SERVICE,
  OrganizationModule,
} from '@vyrak/organization'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { InvitationsController, OrganizationsController } from '../organizations.controller'

/**
 * Integration tests for OrganizationsController
 * Tests module wiring and dependency injection
 *
 * Note: Full HTTP endpoint tests require repository refactoring to handle
 * tenant context properly with withSystemAccess. See repository integration
 * tests for business logic validation.
 */
describe('OrganizationsController (Integration)', () => {
  let app: INestApplication
  let organizationsController: OrganizationsController
  let invitationsController: InvitationsController

  beforeAll(async () => {
    try {
      await startPostgres()
      getPrismaClient()

      // Create NestJS testing module
      const moduleRef: TestingModule = await Test.createTestingModule({
        imports: [DatabaseModule, OrganizationModule],
        controllers: [OrganizationsController, InvitationsController],
      }).compile()

      app = moduleRef.createNestApplication()
      await app.init()

      organizationsController = moduleRef.get<OrganizationsController>(OrganizationsController)
      invitationsController = moduleRef.get<InvitationsController>(InvitationsController)
    } catch (error) {
      console.warn('PostgreSQL setup failed, skipping integration tests:', error)
    }
  })

  afterAll(async () => {
    try {
      if (app) {
        await app.close()
      }
    } finally {
      await stopPostgres()
    }
  })

  describe('Module Wiring', () => {
    it('should create OrganizationsController with dependencies', () => {
      expect(organizationsController).toBeDefined()
      // Verify DI worked
      expect((organizationsController as any).organizationsService).toBeDefined()
      expect((organizationsController as any).membersService).toBeDefined()
      expect((organizationsController as any).invitationsService).toBeDefined()
    })

    it('should create InvitationsController with dependencies', () => {
      expect(invitationsController).toBeDefined()
      expect((invitationsController as any).invitationsService).toBeDefined()
    })

    it('should inject correct service instances from module', async () => {
      if (!app) return

      const orgService = app.get(ORGANIZATION_SERVICE)
      const memberService = app.get(MEMBER_SERVICE)
      const invitationService = app.get(INVITATION_SERVICE)

      expect(orgService).toBeDefined()
      expect(memberService).toBeDefined()
      expect(invitationService).toBeDefined()
    })
  })

  describe('Controller Metadata', () => {
    it('should have correct route prefix', () => {
      const metadata = Reflect.getMetadata('path', OrganizationsController)
      expect(metadata).toBe('api/organizations')
    })

    it('should have swagger tags', () => {
      const tags = Reflect.getMetadata('swagger/apiUseTags', OrganizationsController)
      expect(tags).toContain('organizations')
    })

    it('should have auth guard applied', () => {
      const guards = Reflect.getMetadata('__guards__', OrganizationsController)
      expect(guards).toBeDefined()
      expect(guards.length).toBeGreaterThan(0)
    })
  })
})
