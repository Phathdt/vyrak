import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ArtifactNotFoundError } from '../../domain/exceptions/artifact.exceptions'
import { ArtifactService } from './artifact.service'

import type {
  ArtifactEntity,
  ArtifactFilters,
  CreateArtifactInput,
  IArtifactRepository,
  IStorageService,
} from '../../domain'

const baseArtifact: ArtifactEntity = {
  id: 'artifact-1',
  organizationId: 'org-1',
  workflowId: 'workflow-1',
  phaseId: null,
  agentExecutionId: null,
  key: 'prd',
  type: 'prd',
  title: 'PRD',
  fileName: 'prd.md',
  s3Bucket: 'vyrak-artifacts',
  s3Key: 'artifacts/workflow-1/prd/v1.md',
  mimeType: 'text/markdown',
  contentSize: 10,
  checksum: 'checksum',
  version: 1,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('ArtifactService', () => {
  let service: ArtifactService
  let repository: vi.Mocked<IArtifactRepository>
  let storage: vi.Mocked<IStorageService>

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByWorkflow: vi.fn(),
      findByPhase: vi.fn(),
      findByType: vi.fn(),
      findByKey: vi.fn(),
      findLatestVersion: vi.fn(),
    } as unknown as vi.Mocked<IArtifactRepository>

    storage = {
      upload: vi.fn(),
      download: vi.fn(),
      delete: vi.fn(),
      getBucket: vi.fn(),
    } as unknown as vi.Mocked<IStorageService>

    service = new ArtifactService(repository, storage)
  })

  describe('uploadArtifact', () => {
    it('uploads content to storage and persists artifact metadata at version 1', async () => {
      repository.findLatestVersion.mockResolvedValue(null)
      storage.getBucket.mockReturnValue('vyrak-artifacts')
      storage.upload.mockResolvedValue({ size: 42, checksum: 'abc' })
      repository.create.mockResolvedValue(baseArtifact)

      const result = await service.uploadArtifact('workflow-1', 'prd', 'prd', 'PRD', '# Content', {
        phaseId: 'phase-1',
      })

      expect(storage.upload).toHaveBeenCalledWith('artifacts/workflow-1/prd/v1.md', '# Content', 'text/markdown')
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining<CreateArtifactInput>({
          workflowId: 'workflow-1',
          phaseId: 'phase-1',
          key: 'prd',
          type: 'prd',
          title: 'PRD',
          s3Bucket: 'vyrak-artifacts',
          s3Key: 'artifacts/workflow-1/prd/v1.md',
          mimeType: 'text/markdown',
          contentSize: 42,
          checksum: 'abc',
          version: 1,
        })
      )
      expect(result).toEqual(baseArtifact)
    })

    it('increments version when an artifact with the same key exists', async () => {
      repository.findLatestVersion.mockResolvedValue({ ...baseArtifact, version: 2 })
      storage.getBucket.mockReturnValue('vyrak-artifacts')
      storage.upload.mockResolvedValue({ size: 5, checksum: 'def' })
      repository.create.mockResolvedValue({ ...baseArtifact, version: 3 })

      await service.uploadArtifact('workflow-1', 'prd', 'prd', 'PRD', 'updated')

      expect(storage.upload).toHaveBeenCalledWith('artifacts/workflow-1/prd/v3.md', 'updated', 'text/markdown')
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining<CreateArtifactInput>({ version: 3 }))
    })

    it('sanitizes keys that contain unsafe path characters', async () => {
      repository.findLatestVersion.mockResolvedValue(null)
      storage.getBucket.mockReturnValue('bucket')
      storage.upload.mockResolvedValue({ size: 1, checksum: 'x' })
      repository.create.mockResolvedValue(baseArtifact)

      await service.uploadArtifact('workflow-1', 'adr', 'adr 001/auth', 'ADR', 'body')

      expect(storage.upload).toHaveBeenCalledWith('artifacts/workflow-1/adr-001-auth/v1.md', 'body', 'text/markdown')
    })
  })

  describe('getArtifact', () => {
    it('returns the artifact from the repository', async () => {
      repository.findById.mockResolvedValue(baseArtifact)

      await expect(service.getArtifact('artifact-1')).resolves.toEqual(baseArtifact)
    })

    it('throws ArtifactNotFoundError when the artifact does not exist', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(service.getArtifact('missing')).rejects.toBeInstanceOf(ArtifactNotFoundError)
    })
  })

  describe('downloadArtifact', () => {
    it('returns metadata plus content fetched from storage', async () => {
      repository.findById.mockResolvedValue(baseArtifact)
      storage.download.mockResolvedValue('# Content')

      const result = await service.downloadArtifact('artifact-1')

      expect(storage.download).toHaveBeenCalledWith(baseArtifact.s3Key)
      expect(result).toEqual({ artifact: baseArtifact, content: '# Content' })
    })

    it('propagates not found before touching storage', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(service.downloadArtifact('missing')).rejects.toBeInstanceOf(ArtifactNotFoundError)
      expect(storage.download).not.toHaveBeenCalled()
    })
  })

  describe('listing', () => {
    it('lists workflow artifacts with the given filters', async () => {
      const filters: ArtifactFilters = { type: 'adr' }
      repository.findByWorkflow.mockResolvedValue([baseArtifact])

      await expect(service.listWorkflowArtifacts('workflow-1', filters)).resolves.toEqual([baseArtifact])
      expect(repository.findByWorkflow).toHaveBeenCalledWith('workflow-1', filters)
    })

    it('lists phase artifacts', async () => {
      repository.findByPhase.mockResolvedValue([baseArtifact])

      await expect(service.listPhaseArtifacts('phase-1')).resolves.toEqual([baseArtifact])
      expect(repository.findByPhase).toHaveBeenCalledWith('phase-1')
    })
  })

  describe('parseArtifactTags', () => {
    it('extracts a single artifact tag', () => {
      const response = `<artifact type="prd" key="prd" title="My PRD" format="markdown">
# Title

Body
</artifact>`

      expect(service.parseArtifactTags(response)).toEqual([
        {
          type: 'prd',
          key: 'prd',
          title: 'My PRD',
          format: 'markdown',
          content: '# Title\n\nBody',
        },
      ])
    })

    it('extracts multiple artifact tags', () => {
      const response = [
        '<artifact type="adr" key="adr-001" title="ADR 1" format="markdown">A</artifact>',
        '<artifact type="ard" key="ard" title="ARD" format="markdown">B</artifact>',
      ].join('\n')

      const parsed = service.parseArtifactTags(response)

      expect(parsed).toHaveLength(2)
      expect(parsed.map((item) => item.key)).toEqual(['adr-001', 'ard'])
    })

    it('falls back to type for missing key and title', () => {
      const parsed = service.parseArtifactTags('<artifact type="ard">body</artifact>')

      expect(parsed).toEqual([{ type: 'ard', key: 'ard', title: 'ard', format: 'markdown', content: 'body' }])
    })

    it('ignores tags without a type or empty content', () => {
      const response = ['<artifact key="prd">body</artifact>', '<artifact type="prd">   </artifact>'].join('\n')

      expect(service.parseArtifactTags(response)).toEqual([])
    })

    it('returns an empty array when no tags are present', () => {
      expect(service.parseArtifactTags('no artifacts here')).toEqual([])
    })
  })
})
