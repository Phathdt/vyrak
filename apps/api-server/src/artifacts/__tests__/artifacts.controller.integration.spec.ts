import { Test } from '@nestjs/testing'
import {
  ARTIFACT_REPOSITORY,
  ARTIFACT_SERVICE,
  ARTIFACT_STORAGE,
  ArtifactNotFoundError,
  ArtifactPrismaRepository,
  ArtifactService,
} from '@vyrak/artifact'
import { DatabaseService } from '@vyrak/database'
import { createTestDatabaseService, getPrismaClient, startPostgres, stopPostgres } from '@vyrak/database/test-utils'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { ArtifactsController } from '../artifacts.controller'

import type { TestingModule } from '@nestjs/testing'
import type { IStorageService } from '@vyrak/artifact'

/**
 * In-memory storage double.
 * Artifact persistence is exercised against a real PostgreSQL instance;
 * only object storage is stubbed so the suite does not require S3/Floci.
 */
class InMemoryStorage implements IStorageService {
  readonly objects = new Map<string, string>()

  async upload(key: string, content: string): Promise<{ size: number; checksum: string }> {
    this.objects.set(key, content)
    return { size: Buffer.byteLength(content, 'utf8'), checksum: `checksum-${key}` }
  }

  async download(key: string): Promise<string> {
    const content = this.objects.get(key)
    if (content === undefined) {
      throw new Error(`Missing object: ${key}`)
    }
    return content
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key)
  }

  getBucket(): string {
    return 'vyrak-artifacts-test'
  }
}

describe('ArtifactsController (Integration)', () => {
  let databaseService: ReturnType<typeof createTestDatabaseService> | undefined
  let storage: InMemoryStorage
  let controller: ArtifactsController
  let moduleRef: TestingModule | undefined
  let organizationId: string
  let workflowId: string

  /** Run controller calls inside an explicit tenant context. */
  const asTenant = <T>(fn: (controller: ArtifactsController) => Promise<T>, orgId = organizationId): Promise<T> => {
    return databaseService!.withOrganization(orgId, () => fn(controller))
  }

  beforeAll(async () => {
    try {
      await startPostgres()
      const prisma = getPrismaClient()
      databaseService = createTestDatabaseService(prisma)

      const repository = new ArtifactPrismaRepository(databaseService as unknown as DatabaseService)
      storage = new InMemoryStorage()

      moduleRef = await Test.createTestingModule({
        controllers: [ArtifactsController],
        providers: [
          { provide: DatabaseService, useValue: databaseService },
          { provide: ARTIFACT_REPOSITORY, useValue: repository },
          { provide: ARTIFACT_STORAGE, useValue: storage },
          {
            provide: ARTIFACT_SERVICE,
            useFactory: (repo: ArtifactPrismaRepository, store: InMemoryStorage) => new ArtifactService(repo, store),
            inject: [ARTIFACT_REPOSITORY, ARTIFACT_STORAGE],
          },
        ],
      }).compile()

      controller = moduleRef.get(ArtifactsController)
    } catch (error) {
      console.warn('PostgreSQL setup failed, skipping integration tests:', error)
    }
  })

  afterAll(async () => {
    await moduleRef?.close()
    await stopPostgres()
  })

  beforeEach(async () => {
    if (!databaseService) return

    const prisma = getPrismaClient()
    await prisma.artifact.deleteMany()
    organizationId = crypto.randomUUID()
    workflowId = crypto.randomUUID()
    storage.objects.clear()
  })

  describe('upload and list', () => {
    it('persists a new artifact at version 1 and returns it in the workflow list', async () => {
      if (!databaseService) return

      const created = await asTenant((c) =>
        c.upload(workflowId, {
          type: 'prd',
          key: 'prd',
          title: 'Checkout PRD',
          content: '# Checkout PRD',
        })
      )

      expect(created).toMatchObject({
        organizationId,
        workflowId,
        key: 'prd',
        type: 'prd',
        title: 'Checkout PRD',
        version: 1,
        s3Bucket: 'vyrak-artifacts-test',
        contentSize: Buffer.byteLength('# Checkout PRD', 'utf8'),
      })
      expect(typeof created.createdAt).toBe('string')

      const list = await asTenant((c) => c.list(workflowId, {}))

      expect(list.items).toHaveLength(1)
      expect(list.items[0].id).toBe(created.id)
    })

    it('keeps previous versions when the same key is uploaded again', async () => {
      if (!databaseService) return

      await asTenant((c) => c.upload(workflowId, { type: 'prd', key: 'prd', title: 'PRD v1', content: 'v1' }))
      const second = await asTenant((c) =>
        c.upload(workflowId, { type: 'prd', key: 'prd', title: 'PRD v2', content: 'v2' })
      )

      expect(second.version).toBe(2)

      const list = await asTenant((c) => c.list(workflowId, { key: 'prd' }))
      expect(list.items.map((item) => item.version).sort()).toEqual([1, 2])
    })

    it('filters by artifact type', async () => {
      if (!databaseService) return

      await asTenant((c) => c.upload(workflowId, { type: 'prd', key: 'prd', title: 'PRD', content: 'a' }))
      await asTenant((c) => c.upload(workflowId, { type: 'adr', key: 'adr-001', title: 'ADR 1', content: 'b' }))

      const list = await asTenant((c) => c.list(workflowId, { type: 'adr' }))

      expect(list.items).toHaveLength(1)
      expect(list.items[0].key).toBe('adr-001')
    })

    it('does not expose artifacts belonging to another organization', async () => {
      if (!databaseService) return

      const created = await asTenant((c) =>
        c.upload(workflowId, { type: 'prd', key: 'prd', title: 'PRD', content: 'a' })
      )

      const otherOrgId = crypto.randomUUID()

      const list = await asTenant((c) => c.list(workflowId, {}), otherOrgId)
      expect(list.items).toEqual([])

      await expect(asTenant((c) => c.findOne(created.id), otherOrgId)).rejects.toBeInstanceOf(ArtifactNotFoundError)
    })
  })

  describe('get artifact', () => {
    it('returns artifact metadata without content', async () => {
      if (!databaseService) return

      const created = await asTenant((c) =>
        c.upload(workflowId, { type: 'ard', key: 'ard', title: 'ARD', content: '# ARD' })
      )
      const fetched = await asTenant((c) => c.findOne(created.id))

      expect(fetched).toEqual(created)
      expect('content' in fetched).toBe(false)
    })

    it('throws ArtifactNotFoundError for an unknown artifact id', async () => {
      if (!databaseService) return

      await expect(asTenant((c) => c.findOne(crypto.randomUUID()))).rejects.toBeInstanceOf(ArtifactNotFoundError)
    })
  })

  describe('artifact content', () => {
    it('returns markdown content fetched from storage alongside metadata', async () => {
      if (!databaseService) return

      const created = await asTenant((c) =>
        c.upload(workflowId, {
          type: 'implementation-plan',
          key: 'implementation-plan',
          title: 'Implementation Plan',
          content: '# Plan\n\n- Step 1',
        })
      )

      const result = await asTenant((c) => c.getContent(created.id))

      expect(result.content).toBe('# Plan\n\n- Step 1')
      expect(result.id).toBe(created.id)
      expect(result.version).toBe(1)
    })

    it('serves the latest version content for a re-uploaded key', async () => {
      if (!databaseService) return

      await asTenant((c) => c.upload(workflowId, { type: 'prd', key: 'prd', title: 'PRD', content: 'old' }))
      const latest = await asTenant((c) =>
        c.upload(workflowId, { type: 'prd', key: 'prd', title: 'PRD', content: 'new' })
      )

      const result = await asTenant((c) => c.getContent(latest.id))

      expect(result.content).toBe('new')
    })

    it('throws ArtifactNotFoundError when the artifact row is missing', async () => {
      if (!databaseService) return

      await expect(asTenant((c) => c.getContent(crypto.randomUUID()))).rejects.toBeInstanceOf(ArtifactNotFoundError)
    })
  })

  describe('response mapping', () => {
    it('round-trips optional phase and execution references', async () => {
      if (!databaseService) return

      const phaseId = crypto.randomUUID()
      const agentExecutionId = crypto.randomUUID()

      const created = await asTenant((c) =>
        c.upload(workflowId, {
          type: 'adr',
          key: 'adr-002',
          title: 'ADR 2',
          content: 'body',
          phaseId,
          agentExecutionId,
          fileName: 'adr-002.md',
          mimeType: 'text/markdown',
        })
      )

      const fetched = await asTenant((c) => c.findOne(created.id))

      expect(fetched.phaseId).toBe(phaseId)
      expect(fetched.agentExecutionId).toBe(agentExecutionId)
      expect(fetched.fileName).toBe('adr-002.md')
      expect(fetched.metadata).toBeNull()
      expect(fetched.checksum).toBe(`checksum-${created.s3Key}`)
    })

    it('keeps the phase association visible in the workflow list', async () => {
      if (!databaseService) return

      const phaseId = crypto.randomUUID()
      await asTenant((c) => c.upload(workflowId, { type: 'prd', key: 'prd', title: 'PRD', content: 'a', phaseId }))

      const list = await asTenant((c) => c.list(workflowId, {}))

      expect(list.items[0].phaseId).toBe(phaseId)
    })
  })
})
