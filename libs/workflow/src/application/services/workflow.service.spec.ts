import { BadRequestException, NotFoundException } from '@nestjs/common'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

import { WorkflowStatus, WorkflowType } from '../../domain'
import { WorkflowService } from './workflow.service'

import type {
  CreateWorkflowInput,
  ListWorkflowsQuery,
  UpdateWorkflowInput,
  WorkflowEntity,
  WorkflowRepositoryEntity,
} from '../../domain'

describe('WorkflowService', () => {
  let service: WorkflowService
  let mockWorkflowRepository: any
  let mockWorkflowRepositoryRepository: any

  const createMockWorkflow = (overrides?: Partial<WorkflowEntity>): WorkflowEntity => ({
    id: 'workflow-123',
    organizationId: 'org-123',
    projectId: 'project-123',
    type: null,
    status: WorkflowStatus.DRAFT,
    title: 'Test Workflow',
    description: 'Test Description',
    currentPhaseKey: null,
    definitionSnapshot: null,
    classification: null,
    classificationConfirmedAt: null,
    classificationConfirmedById: null,
    createdById: 'user-123',
    startedAt: null,
    completedAt: null,
    createdAt: new Date('2026-10-31'),
    updatedAt: new Date('2026-10-31'),
    ...overrides,
  })

  const createMockRepository = (): WorkflowRepositoryEntity => ({
    id: 'repo-123',
    workflowId: 'workflow-123',
    repositoryId: 'repo-id-123',
    organizationId: 'org-123',
    createdAt: new Date(),
  })

  beforeEach(() => {
    mockWorkflowRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      updateType: vi.fn(),
      delete: vi.fn(),
    }

    mockWorkflowRepositoryRepository = {
      findByWorkflowId: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      deleteByWorkflowId: vi.fn(),
    }

    service = new WorkflowService(mockWorkflowRepository, mockWorkflowRepositoryRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('create() method', () => {
    it('should create workflow with repositories', async () => {
      const mockWorkflow = createMockWorkflow()
      const mockRepositories = [createMockRepository(), createMockRepository()]

      mockWorkflowRepository.create.mockResolvedValue(mockWorkflow)
      mockWorkflowRepositoryRepository.createMany.mockResolvedValue(undefined)
      mockWorkflowRepositoryRepository.findByWorkflowId.mockResolvedValue(mockRepositories)

      const input: CreateWorkflowInput = {
        title: 'Test Workflow',
        description: 'Test Description',
        repositoryIds: ['repo-1', 'repo-2'],
      }

      const result = await service.create('org-123', 'project-123', 'user-123', input)

      expect(result).toEqual({
        ...mockWorkflow,
        repositories: mockRepositories,
      })
    })

    it('should call workflowRepository.create with correct parameters', async () => {
      const mockWorkflow = createMockWorkflow()
      mockWorkflowRepository.create.mockResolvedValue(mockWorkflow)
      mockWorkflowRepositoryRepository.createMany.mockResolvedValue(undefined)
      mockWorkflowRepositoryRepository.findByWorkflowId.mockResolvedValue([])

      const input: CreateWorkflowInput = {
        title: 'New Workflow',
        description: 'New Description',
        repositoryIds: ['repo-1'],
      }

      await service.create('org-123', 'project-123', 'user-123', input)

      expect(mockWorkflowRepository.create).toHaveBeenCalledWith('project-123', 'user-123', {
        title: 'New Workflow',
        description: 'New Description',
      })
    })

    it('should call workflowRepositoryRepository.createMany with workflow id and repository ids', async () => {
      const mockWorkflow = createMockWorkflow()
      mockWorkflowRepository.create.mockResolvedValue(mockWorkflow)
      mockWorkflowRepositoryRepository.createMany.mockResolvedValue(undefined)
      mockWorkflowRepositoryRepository.findByWorkflowId.mockResolvedValue([])

      const input: CreateWorkflowInput = {
        title: 'Test',
        repositoryIds: ['repo-1', 'repo-2', 'repo-3'],
      }

      await service.create('org-123', 'project-123', 'user-123', input)

      expect(mockWorkflowRepositoryRepository.createMany).toHaveBeenCalledWith('workflow-123', [
        'repo-1',
        'repo-2',
        'repo-3',
      ])
    })

    it('should fetch repositories after creation', async () => {
      const mockWorkflow = createMockWorkflow()
      mockWorkflowRepository.create.mockResolvedValue(mockWorkflow)
      mockWorkflowRepositoryRepository.createMany.mockResolvedValue(undefined)
      mockWorkflowRepositoryRepository.findByWorkflowId.mockResolvedValue([])

      const input: CreateWorkflowInput = {
        title: 'Test',
        repositoryIds: ['repo-1'],
      }

      await service.create('org-123', 'project-123', 'user-123', input)

      expect(mockWorkflowRepositoryRepository.findByWorkflowId).toHaveBeenCalledWith('workflow-123')
    })

    it('should handle workflow with empty repositories list', async () => {
      const mockWorkflow = createMockWorkflow()
      mockWorkflowRepository.create.mockResolvedValue(mockWorkflow)
      mockWorkflowRepositoryRepository.createMany.mockResolvedValue(undefined)
      mockWorkflowRepositoryRepository.findByWorkflowId.mockResolvedValue([])

      const input: CreateWorkflowInput = {
        title: 'Test',
        repositoryIds: [],
      }

      const result = await service.create('org-123', 'project-123', 'user-123', input)

      expect(result.repositories).toEqual([])
    })

    it('should handle creation with null description', async () => {
      const mockWorkflow = createMockWorkflow({ description: null })
      mockWorkflowRepository.create.mockResolvedValue(mockWorkflow)
      mockWorkflowRepositoryRepository.createMany.mockResolvedValue(undefined)
      mockWorkflowRepositoryRepository.findByWorkflowId.mockResolvedValue([])

      const input: CreateWorkflowInput = {
        title: 'Test',
        description: null,
        repositoryIds: [],
      }

      const result = await service.create('org-123', 'project-123', 'user-123', input)

      expect(result.description).toBeNull()
    })

    it('should propagate repository creation errors', async () => {
      const mockWorkflow = createMockWorkflow()
      mockWorkflowRepository.create.mockResolvedValue(mockWorkflow)
      mockWorkflowRepositoryRepository.createMany.mockRejectedValue(new Error('Repository error'))

      const input: CreateWorkflowInput = {
        title: 'Test',
        repositoryIds: ['repo-1'],
      }

      await expect(service.create('org-123', 'project-123', 'user-123', input)).rejects.toThrow('Repository error')
    })
  })

  describe('findById() method', () => {
    it('should return workflow with repositories', async () => {
      const mockWorkflow = createMockWorkflow()
      const mockRepositories = [createMockRepository()]

      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepositoryRepository.findByWorkflowId.mockResolvedValue(mockRepositories)

      const result = await service.findById('org-123', 'workflow-123')

      expect(result).toEqual({
        ...mockWorkflow,
        repositories: mockRepositories,
      })
    })

    it('should return null if workflow does not exist', async () => {
      mockWorkflowRepository.findById.mockResolvedValue(null)

      const result = await service.findById('org-123', 'nonexistent-id')

      expect(result).toBeNull()
    })

    it('should not fetch repositories if workflow does not exist', async () => {
      mockWorkflowRepository.findById.mockResolvedValue(null)

      await service.findById('org-123', 'nonexistent-id')

      expect(mockWorkflowRepositoryRepository.findByWorkflowId).not.toHaveBeenCalled()
    })

    it('should call findByWorkflowId with correct id', async () => {
      const mockWorkflow = createMockWorkflow()
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepositoryRepository.findByWorkflowId.mockResolvedValue([])

      await service.findById('org-123', 'workflow-123')

      expect(mockWorkflowRepositoryRepository.findByWorkflowId).toHaveBeenCalledWith('workflow-123')
    })

    it('should handle workflow with multiple repositories', async () => {
      const mockWorkflow = createMockWorkflow()
      const mockRepositories = [createMockRepository(), createMockRepository(), createMockRepository()]

      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepositoryRepository.findByWorkflowId.mockResolvedValue(mockRepositories)

      const result = await service.findById('org-123', 'workflow-123')

      expect(result?.repositories).toHaveLength(3)
    })
  })

  describe('findAll() method', () => {
    it('should return paginated workflows', async () => {
      const mockWorkflows = [createMockWorkflow(), createMockWorkflow({ id: 'workflow-456' })]
      const mockRepositories = [[createMockRepository()], [createMockRepository()]]

      mockWorkflowRepository.findAll.mockResolvedValue(mockWorkflows)
      mockWorkflowRepository.count.mockResolvedValue(2)
      mockWorkflowRepositoryRepository.findByWorkflowId
        .mockResolvedValueOnce(mockRepositories[0])
        .mockResolvedValueOnce(mockRepositories[1])

      const query: ListWorkflowsQuery = {
        page: 1,
        limit: 10,
      }

      const result = await service.findAll('org-123', 'project-123', query)

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })

    it('should calculate skip correctly for pagination', async () => {
      mockWorkflowRepository.findAll.mockResolvedValue([])
      mockWorkflowRepository.count.mockResolvedValue(0)

      const query: ListWorkflowsQuery = {
        page: 3,
        limit: 10,
      }

      await service.findAll('org-123', 'project-123', query)

      expect(mockWorkflowRepository.findAll).toHaveBeenCalledWith('project-123', {
        search: undefined,
        type: undefined,
        status: undefined,
        createdById: undefined,
        sort: undefined,
        order: undefined,
        skip: 20,
        take: 10,
      })
    })

    it('should calculate totalPages correctly', async () => {
      mockWorkflowRepository.findAll.mockResolvedValue([])
      mockWorkflowRepository.count.mockResolvedValue(25)

      const query: ListWorkflowsQuery = {
        page: 1,
        limit: 10,
      }

      const result = await service.findAll('org-123', 'project-123', query)

      expect(result.totalPages).toBe(3)
    })

    it('should handle page with partial results', async () => {
      mockWorkflowRepository.findAll.mockResolvedValue([createMockWorkflow()])
      mockWorkflowRepository.count.mockResolvedValue(21)

      const query: ListWorkflowsQuery = {
        page: 3,
        limit: 10,
      }

      const result = await service.findAll('org-123', 'project-123', query)

      expect(result.totalPages).toBe(3)
      expect(result.items).toHaveLength(1)
    })

    it('should pass filters to repository', async () => {
      mockWorkflowRepository.findAll.mockResolvedValue([])
      mockWorkflowRepository.count.mockResolvedValue(0)

      const query: ListWorkflowsQuery = {
        page: 1,
        limit: 10,
        search: 'feature',
        type: WorkflowType.STORY,
        status: WorkflowStatus.ACTIVE,
        createdById: 'user-123',
        sort: 'createdAt',
        order: 'desc',
      }

      await service.findAll('org-123', 'project-123', query)

      expect(mockWorkflowRepository.findAll).toHaveBeenCalledWith('project-123', {
        search: 'feature',
        type: WorkflowType.STORY,
        status: WorkflowStatus.ACTIVE,
        createdById: 'user-123',
        sort: 'createdAt',
        order: 'desc',
        skip: 0,
        take: 10,
      })
    })

    it('should fetch repositories in parallel', async () => {
      const mockWorkflows = [createMockWorkflow(), createMockWorkflow({ id: 'workflow-456' })]
      mockWorkflowRepository.findAll.mockResolvedValue(mockWorkflows)
      mockWorkflowRepository.count.mockResolvedValue(2)
      mockWorkflowRepositoryRepository.findByWorkflowId.mockResolvedValueOnce([]).mockResolvedValueOnce([])

      const query: ListWorkflowsQuery = {
        page: 1,
        limit: 10,
      }

      await service.findAll('org-123', 'project-123', query)

      expect(mockWorkflowRepositoryRepository.findByWorkflowId).toHaveBeenCalledTimes(2)
      expect(mockWorkflowRepositoryRepository.findByWorkflowId).toHaveBeenNthCalledWith(1, 'workflow-123')
      expect(mockWorkflowRepositoryRepository.findByWorkflowId).toHaveBeenNthCalledWith(2, 'workflow-456')
    })

    it('should attach repositories to corresponding workflows', async () => {
      const mockWorkflows = [createMockWorkflow(), createMockWorkflow({ id: 'workflow-456' })]
      const mockRepos1 = [createMockRepository()]
      const mockRepos2 = [createMockRepository(), createMockRepository()]

      mockWorkflowRepository.findAll.mockResolvedValue(mockWorkflows)
      mockWorkflowRepository.count.mockResolvedValue(2)
      mockWorkflowRepositoryRepository.findByWorkflowId
        .mockResolvedValueOnce(mockRepos1)
        .mockResolvedValueOnce(mockRepos2)

      const query: ListWorkflowsQuery = {
        page: 1,
        limit: 10,
      }

      const result = await service.findAll('org-123', 'project-123', query)

      expect(result.items[0].repositories).toBe(mockRepos1)
      expect(result.items[1].repositories).toBe(mockRepos2)
    })

    it('should handle empty results', async () => {
      mockWorkflowRepository.findAll.mockResolvedValue([])
      mockWorkflowRepository.count.mockResolvedValue(0)

      const query: ListWorkflowsQuery = {
        page: 1,
        limit: 10,
      }

      const result = await service.findAll('org-123', 'project-123', query)

      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
      expect(result.totalPages).toBe(0)
    })

    it('should use Promise.all for parallel operations', async () => {
      const mockWorkflows = [createMockWorkflow()]
      mockWorkflowRepository.findAll.mockResolvedValue(mockWorkflows)
      mockWorkflowRepository.count.mockResolvedValue(1)
      mockWorkflowRepositoryRepository.findByWorkflowId.mockResolvedValue([])

      const query: ListWorkflowsQuery = {
        page: 1,
        limit: 10,
      }

      const startTime = Date.now()
      await service.findAll('org-123', 'project-123', query)

      // Just verify both calls were made (not testing timing)
      expect(mockWorkflowRepository.findAll).toHaveBeenCalled()
      expect(mockWorkflowRepository.count).toHaveBeenCalled()
    })
  })

  describe('update() method', () => {
    it('should update workflow when in DRAFT status', async () => {
      const mockWorkflow = createMockWorkflow()
      const updatedWorkflow = createMockWorkflow({ title: 'Updated Title' })

      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepository.update.mockResolvedValue(updatedWorkflow)

      const data: UpdateWorkflowInput = {
        title: 'Updated Title',
      }

      const result = await service.update('org-123', 'workflow-123', data)

      expect(result).toEqual(updatedWorkflow)
    })

    it('should call update with correct parameters', async () => {
      const mockWorkflow = createMockWorkflow()
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepository.update.mockResolvedValue(mockWorkflow)

      const data: UpdateWorkflowInput = {
        title: 'New Title',
        description: 'New Description',
      }

      await service.update('org-123', 'workflow-123', data)

      expect(mockWorkflowRepository.update).toHaveBeenCalledWith('workflow-123', data)
    })

    it('should throw NotFoundException if workflow not found', async () => {
      mockWorkflowRepository.findById.mockResolvedValue(null)

      const data: UpdateWorkflowInput = {
        title: 'New Title',
      }

      await expect(service.update('org-123', 'nonexistent-id', data)).rejects.toThrow(NotFoundException)
      await expect(service.update('org-123', 'nonexistent-id', data)).rejects.toThrow('Workflow not found')
    })

    it('should throw BadRequestException if workflow is not DRAFT', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.ACTIVE })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)

      const data: UpdateWorkflowInput = {
        title: 'New Title',
      }

      await expect(service.update('org-123', 'workflow-123', data)).rejects.toThrow(BadRequestException)
      await expect(service.update('org-123', 'workflow-123', data)).rejects.toThrow(
        'Only DRAFT workflows can be updated'
      )
    })

    it('should throw BadRequestException for BRAINSTORMING status', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.BRAINSTORMING })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)

      const data: UpdateWorkflowInput = { title: 'New Title' }

      await expect(service.update('org-123', 'workflow-123', data)).rejects.toThrow(
        'Only DRAFT workflows can be updated'
      )
    })

    it('should throw BadRequestException for COMPLETED status', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.COMPLETED })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)

      const data: UpdateWorkflowInput = { title: 'New Title' }

      await expect(service.update('org-123', 'workflow-123', data)).rejects.toThrow(
        'Only DRAFT workflows can be updated'
      )
    })

    it('should allow updating only title', async () => {
      const mockWorkflow = createMockWorkflow()
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepository.update.mockResolvedValue(mockWorkflow)

      const data: UpdateWorkflowInput = {
        title: 'New Title',
      }

      await service.update('org-123', 'workflow-123', data)

      expect(mockWorkflowRepository.update).toHaveBeenCalledWith('workflow-123', data)
    })

    it('should allow updating only description', async () => {
      const mockWorkflow = createMockWorkflow()
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepository.update.mockResolvedValue(mockWorkflow)

      const data: UpdateWorkflowInput = {
        description: 'New Description',
      }

      await service.update('org-123', 'workflow-123', data)

      expect(mockWorkflowRepository.update).toHaveBeenCalledWith('workflow-123', data)
    })

    it('should handle null description update', async () => {
      const mockWorkflow = createMockWorkflow()
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepository.update.mockResolvedValue(mockWorkflow)

      const data: UpdateWorkflowInput = {
        description: null,
      }

      await service.update('org-123', 'workflow-123', data)

      expect(mockWorkflowRepository.update).toHaveBeenCalledWith('workflow-123', { description: null })
    })

    it('should propagate repository errors', async () => {
      mockWorkflowRepository.findById.mockResolvedValue(createMockWorkflow())
      mockWorkflowRepository.update.mockRejectedValue(new Error('DB error'))

      const data: UpdateWorkflowInput = { title: 'New' }

      await expect(service.update('org-123', 'workflow-123', data)).rejects.toThrow('DB error')
    })
  })

  describe('delete() method', () => {
    it('should delete workflow when in DRAFT status', async () => {
      const mockWorkflow = createMockWorkflow()
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepositoryRepository.deleteByWorkflowId.mockResolvedValue(undefined)
      mockWorkflowRepository.delete.mockResolvedValue(undefined)

      await service.delete('org-123', 'workflow-123')

      expect(mockWorkflowRepositoryRepository.deleteByWorkflowId).toHaveBeenCalledWith('workflow-123')
      expect(mockWorkflowRepository.delete).toHaveBeenCalledWith('workflow-123')
    })

    it('should delete repositories before workflow', async () => {
      const mockWorkflow = createMockWorkflow()
      const callOrder: string[] = []

      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepositoryRepository.deleteByWorkflowId.mockImplementation(() => {
        callOrder.push('deleteRepositories')
        return Promise.resolve()
      })
      mockWorkflowRepository.delete.mockImplementation(() => {
        callOrder.push('deleteWorkflow')
        return Promise.resolve()
      })

      await service.delete('org-123', 'workflow-123')

      expect(callOrder).toEqual(['deleteRepositories', 'deleteWorkflow'])
    })

    it('should throw NotFoundException if workflow not found', async () => {
      mockWorkflowRepository.findById.mockResolvedValue(null)

      await expect(service.delete('org-123', 'nonexistent-id')).rejects.toThrow(NotFoundException)
      await expect(service.delete('org-123', 'nonexistent-id')).rejects.toThrow('Workflow not found')
    })

    it('should throw BadRequestException if workflow is not DRAFT', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.ACTIVE })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)

      await expect(service.delete('org-123', 'workflow-123')).rejects.toThrow(BadRequestException)
      await expect(service.delete('org-123', 'workflow-123')).rejects.toThrow('Only DRAFT workflows can be deleted')
    })

    it('should throw BadRequestException for various non-DRAFT statuses', async () => {
      const statuses = [
        WorkflowStatus.BRAINSTORMING,
        WorkflowStatus.ACTIVE,
        WorkflowStatus.COMPLETED,
        WorkflowStatus.FAILED,
      ]

      for (const status of statuses) {
        const mockWorkflow = createMockWorkflow({ status })
        mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)

        await expect(service.delete('org-123', 'workflow-123')).rejects.toThrow('Only DRAFT workflows can be deleted')
      }
    })

    it('should not call delete if workflow not found', async () => {
      mockWorkflowRepository.findById.mockResolvedValue(null)

      try {
        await service.delete('org-123', 'nonexistent-id')
      } catch {
        // expected
      }

      expect(mockWorkflowRepositoryRepository.deleteByWorkflowId).not.toHaveBeenCalled()
      expect(mockWorkflowRepository.delete).not.toHaveBeenCalled()
    })

    it('should not call delete if workflow is not DRAFT', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.ACTIVE })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)

      try {
        await service.delete('org-123', 'workflow-123')
      } catch {
        // expected
      }

      expect(mockWorkflowRepositoryRepository.deleteByWorkflowId).not.toHaveBeenCalled()
      expect(mockWorkflowRepository.delete).not.toHaveBeenCalled()
    })

    it('should propagate deleteByWorkflowId errors', async () => {
      mockWorkflowRepository.findById.mockResolvedValue(createMockWorkflow())
      mockWorkflowRepositoryRepository.deleteByWorkflowId.mockRejectedValue(new Error('Repository delete failed'))

      await expect(service.delete('org-123', 'workflow-123')).rejects.toThrow('Repository delete failed')
    })

    it('should propagate delete errors', async () => {
      mockWorkflowRepository.findById.mockResolvedValue(createMockWorkflow())
      mockWorkflowRepositoryRepository.deleteByWorkflowId.mockResolvedValue(undefined)
      mockWorkflowRepository.delete.mockRejectedValue(new Error('Workflow delete failed'))

      await expect(service.delete('org-123', 'workflow-123')).rejects.toThrow('Workflow delete failed')
    })
  })

  describe('startBrainstorming() method', () => {
    it('should start brainstorming from DRAFT status', async () => {
      const mockWorkflow = createMockWorkflow()
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepository.updateStatus.mockResolvedValue(undefined)

      await service.startBrainstorming('org-123', 'workflow-123')

      expect(mockWorkflowRepository.updateStatus).toHaveBeenCalledWith('workflow-123', WorkflowStatus.BRAINSTORMING)
    })

    it('should throw NotFoundException if workflow not found', async () => {
      mockWorkflowRepository.findById.mockResolvedValue(null)

      await expect(service.startBrainstorming('org-123', 'nonexistent-id')).rejects.toThrow(NotFoundException)
      await expect(service.startBrainstorming('org-123', 'nonexistent-id')).rejects.toThrow('Workflow not found')
    })

    it('should throw BadRequestException if workflow is not DRAFT', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.ACTIVE })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)

      await expect(service.startBrainstorming('org-123', 'workflow-123')).rejects.toThrow(BadRequestException)
      await expect(service.startBrainstorming('org-123', 'workflow-123')).rejects.toThrow(
        'Can only start brainstorming from DRAFT status'
      )
    })

    it('should throw BadRequestException for BRAINSTORMING status', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.BRAINSTORMING })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)

      await expect(service.startBrainstorming('org-123', 'workflow-123')).rejects.toThrow(
        'Can only start brainstorming from DRAFT status'
      )
    })

    it('should throw BadRequestException for COMPLETED status', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.COMPLETED })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)

      await expect(service.startBrainstorming('org-123', 'workflow-123')).rejects.toThrow(
        'Can only start brainstorming from DRAFT status'
      )
    })

    it('should not update status if workflow not found', async () => {
      mockWorkflowRepository.findById.mockResolvedValue(null)

      try {
        await service.startBrainstorming('org-123', 'nonexistent-id')
      } catch {
        // expected
      }

      expect(mockWorkflowRepository.updateStatus).not.toHaveBeenCalled()
    })

    it('should not update status if workflow is not DRAFT', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.ACTIVE })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)

      try {
        await service.startBrainstorming('org-123', 'workflow-123')
      } catch {
        // expected
      }

      expect(mockWorkflowRepository.updateStatus).not.toHaveBeenCalled()
    })

    it('should propagate updateStatus errors', async () => {
      mockWorkflowRepository.findById.mockResolvedValue(createMockWorkflow())
      mockWorkflowRepository.updateStatus.mockRejectedValue(new Error('Update failed'))

      await expect(service.startBrainstorming('org-123', 'workflow-123')).rejects.toThrow('Update failed')
    })
  })

  describe('confirmClassification() method', () => {
    it('should confirm classification from BRAINSTORMING status', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.BRAINSTORMING })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepository.updateType.mockResolvedValue(undefined)
      mockWorkflowRepository.updateStatus.mockResolvedValue(undefined)

      await service.confirmClassification('org-123', 'workflow-123', WorkflowType.STORY, 'user-456')

      expect(mockWorkflowRepository.updateType).toHaveBeenCalledWith('workflow-123', WorkflowType.STORY, 'user-456')
      expect(mockWorkflowRepository.updateStatus).toHaveBeenCalledWith('workflow-123', WorkflowStatus.ACTIVE)
    })

    it('should confirm classification from CLASSIFICATION_PENDING status', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.CLASSIFICATION_PENDING })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepository.updateType.mockResolvedValue(undefined)
      mockWorkflowRepository.updateStatus.mockResolvedValue(undefined)

      await service.confirmClassification('org-123', 'workflow-123', WorkflowType.EPIC, 'user-456')

      expect(mockWorkflowRepository.updateType).toHaveBeenCalledWith('workflow-123', WorkflowType.EPIC, 'user-456')
    })

    it('should update type before status', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.BRAINSTORMING })
      const callOrder: string[] = []

      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepository.updateType.mockImplementation(() => {
        callOrder.push('updateType')
        return Promise.resolve()
      })
      mockWorkflowRepository.updateStatus.mockImplementation(() => {
        callOrder.push('updateStatus')
        return Promise.resolve()
      })

      await service.confirmClassification('org-123', 'workflow-123', WorkflowType.HOTFIX, 'user-456')

      expect(callOrder).toEqual(['updateType', 'updateStatus'])
    })

    it('should throw NotFoundException if workflow not found', async () => {
      mockWorkflowRepository.findById.mockResolvedValue(null)

      await expect(
        service.confirmClassification('org-123', 'nonexistent-id', WorkflowType.STORY, 'user-456')
      ).rejects.toThrow(NotFoundException)
      await expect(
        service.confirmClassification('org-123', 'nonexistent-id', WorkflowType.STORY, 'user-456')
      ).rejects.toThrow('Workflow not found')
    })

    it('should throw BadRequestException if workflow is DRAFT', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.DRAFT })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)

      await expect(
        service.confirmClassification('org-123', 'workflow-123', WorkflowType.STORY, 'user-456')
      ).rejects.toThrow(BadRequestException)
      await expect(
        service.confirmClassification('org-123', 'workflow-123', WorkflowType.STORY, 'user-456')
      ).rejects.toThrow('Can only confirm classification from BRAINSTORMING or CLASSIFICATION_PENDING')
    })

    it('should throw BadRequestException if workflow is ACTIVE', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.ACTIVE })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)

      await expect(
        service.confirmClassification('org-123', 'workflow-123', WorkflowType.STORY, 'user-456')
      ).rejects.toThrow('Can only confirm classification from BRAINSTORMING or CLASSIFICATION_PENDING')
    })

    it('should throw BadRequestException for COMPLETED status', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.COMPLETED })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)

      await expect(
        service.confirmClassification('org-123', 'workflow-123', WorkflowType.STORY, 'user-456')
      ).rejects.toThrow('Can only confirm classification from BRAINSTORMING or CLASSIFICATION_PENDING')
    })

    it('should accept all workflow types', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.BRAINSTORMING })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepository.updateType.mockResolvedValue(undefined)
      mockWorkflowRepository.updateStatus.mockResolvedValue(undefined)

      for (const type of [WorkflowType.HOTFIX, WorkflowType.STORY, WorkflowType.EPIC]) {
        await service.confirmClassification('org-123', 'workflow-123', type, 'user-456')

        expect(mockWorkflowRepository.updateType).toHaveBeenCalledWith('workflow-123', type, 'user-456')
      }
    })

    it('should not update if workflow not found', async () => {
      mockWorkflowRepository.findById.mockResolvedValue(null)

      try {
        await service.confirmClassification('org-123', 'nonexistent-id', WorkflowType.STORY, 'user-456')
      } catch {
        // expected
      }

      expect(mockWorkflowRepository.updateType).not.toHaveBeenCalled()
      expect(mockWorkflowRepository.updateStatus).not.toHaveBeenCalled()
    })

    it('should not update if workflow is not in correct status', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.DRAFT })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)

      try {
        await service.confirmClassification('org-123', 'workflow-123', WorkflowType.STORY, 'user-456')
      } catch {
        // expected
      }

      expect(mockWorkflowRepository.updateType).not.toHaveBeenCalled()
      expect(mockWorkflowRepository.updateStatus).not.toHaveBeenCalled()
    })

    it('should propagate updateType errors', async () => {
      mockWorkflowRepository.findById.mockResolvedValue(createMockWorkflow({ status: WorkflowStatus.BRAINSTORMING }))
      mockWorkflowRepository.updateType.mockRejectedValue(new Error('Type update failed'))

      await expect(
        service.confirmClassification('org-123', 'workflow-123', WorkflowType.STORY, 'user-456')
      ).rejects.toThrow('Type update failed')
    })

    it('should propagate updateStatus errors', async () => {
      mockWorkflowRepository.findById.mockResolvedValue(createMockWorkflow({ status: WorkflowStatus.BRAINSTORMING }))
      mockWorkflowRepository.updateType.mockResolvedValue(undefined)
      mockWorkflowRepository.updateStatus.mockRejectedValue(new Error('Status update failed'))

      await expect(
        service.confirmClassification('org-123', 'workflow-123', WorkflowType.STORY, 'user-456')
      ).rejects.toThrow('Status update failed')
    })

    it('should pass confirmedById correctly to updateType', async () => {
      const mockWorkflow = createMockWorkflow({ status: WorkflowStatus.BRAINSTORMING })
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepository.updateType.mockResolvedValue(undefined)
      mockWorkflowRepository.updateStatus.mockResolvedValue(undefined)

      const confirmedById = 'user-final-approver-789'
      await service.confirmClassification('org-123', 'workflow-123', WorkflowType.EPIC, confirmedById)

      expect(mockWorkflowRepository.updateType).toHaveBeenCalledWith('workflow-123', WorkflowType.EPIC, confirmedById)
    })
  })

  describe('Integration scenarios', () => {
    it('should handle workflow lifecycle: create -> start brainstorming -> confirm classification', async () => {
      const draftWorkflow = createMockWorkflow({ status: WorkflowStatus.DRAFT })
      const brainstormingWorkflow = createMockWorkflow({ status: WorkflowStatus.BRAINSTORMING })

      // Create
      mockWorkflowRepository.create.mockResolvedValue(draftWorkflow)
      mockWorkflowRepositoryRepository.createMany.mockResolvedValue(undefined)
      mockWorkflowRepositoryRepository.findByWorkflowId.mockResolvedValue([])

      const input: CreateWorkflowInput = {
        title: 'New Feature',
        repositoryIds: ['repo-1'],
      }

      const created = await service.create('org-123', 'project-123', 'user-123', input)
      expect(created.status).toBe(WorkflowStatus.DRAFT)

      // Start brainstorming - need to return DRAFT status when finding
      mockWorkflowRepository.findById.mockResolvedValueOnce(draftWorkflow)
      mockWorkflowRepository.updateStatus.mockResolvedValue(undefined)

      await service.startBrainstorming('org-123', 'workflow-123')
      expect(mockWorkflowRepository.updateStatus).toHaveBeenCalledWith('workflow-123', WorkflowStatus.BRAINSTORMING)

      // Confirm classification - now return BRAINSTORMING status
      mockWorkflowRepository.findById.mockResolvedValueOnce(brainstormingWorkflow)
      mockWorkflowRepository.updateType.mockResolvedValue(undefined)
      mockWorkflowRepository.updateStatus.mockResolvedValue(undefined)

      await service.confirmClassification('org-123', 'workflow-123', WorkflowType.STORY, 'user-456')
      expect(mockWorkflowRepository.updateType).toHaveBeenCalledWith('workflow-123', WorkflowType.STORY, 'user-456')
      expect(mockWorkflowRepository.updateStatus).toHaveBeenCalledWith('workflow-123', WorkflowStatus.ACTIVE)
    })

    it('should prevent operations on deleted workflow', async () => {
      const mockWorkflow = createMockWorkflow()
      mockWorkflowRepository.findById.mockResolvedValue(mockWorkflow)
      mockWorkflowRepositoryRepository.deleteByWorkflowId.mockResolvedValue(undefined)
      mockWorkflowRepository.delete.mockResolvedValue(undefined)

      await service.delete('org-123', 'workflow-123')

      // After deletion, trying to find should return null
      mockWorkflowRepository.findById.mockResolvedValue(null)

      const result = await service.findById('org-123', 'workflow-123')
      expect(result).toBeNull()
    })
  })

  describe('Error propagation', () => {
    it('should propagate repository errors without modification', async () => {
      const error = new Error('Database connection failed')
      mockWorkflowRepository.findAll.mockRejectedValue(error)

      const query: ListWorkflowsQuery = { page: 1, limit: 10 }

      await expect(service.findAll('org-123', 'project-123', query)).rejects.toThrow('Database connection failed')
    })

    it('should handle concurrent repository call failures', async () => {
      const mockWorkflows = [createMockWorkflow()]
      mockWorkflowRepository.findAll.mockResolvedValue(mockWorkflows)
      mockWorkflowRepository.count.mockRejectedValue(new Error('Count failed'))

      const query: ListWorkflowsQuery = { page: 1, limit: 10 }

      await expect(service.findAll('org-123', 'project-123', query)).rejects.toThrow('Count failed')
    })
  })
})
