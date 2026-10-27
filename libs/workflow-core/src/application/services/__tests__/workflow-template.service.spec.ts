import { NotFoundException } from '@nestjs/common'
import type { WorkflowTemplate } from '@vyrak/database'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { IWorkflowTemplateRepository } from '../../../domain/interfaces/workflow-template.repository.interface'
import { WorkflowTemplateService } from '../workflow-template.service'

describe('WorkflowTemplateService', () => {
  let service: WorkflowTemplateService
  let mockRepository: ReturnType<typeof vi.fn<any, Partial<IWorkflowTemplateRepository>>>

  const mockTemplates: WorkflowTemplate[] = [
    {
      id: 'template-1',
      key: 'feature',
      name: 'Feature Workflow',
      description: 'Standard feature development workflow',
      icon: '📝',
      isActive: true,
      storyBased: true,
      phases: [],
      estimatedDurationMin: 2,
      estimatedDurationMax: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'template-2',
      key: 'hotfix',
      name: 'Hotfix Workflow',
      description: 'Quick hotfix workflow',
      icon: '🔥',
      isActive: true,
      storyBased: true,
      phases: [],
      estimatedDurationMin: 1,
      estimatedDurationMax: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(() => {
    mockRepository = {
      findAllActive: vi.fn().mockResolvedValue(mockTemplates),
      findById: vi.fn(),
      findByKey: vi.fn(),
      isActive: vi.fn(),
    }

    service = new WorkflowTemplateService(mockRepository as unknown as IWorkflowTemplateRepository)
  })

  describe('listTemplates', () => {
    it('should return all active templates', async () => {
      const result = await service.listTemplates()

      expect(result).toEqual(mockTemplates)
      expect(mockRepository.findAllActive).toHaveBeenCalled()
    })

    it('should return empty array if no templates', async () => {
      mockRepository.findAllActive.mockResolvedValue([])

      const result = await service.listTemplates()

      expect(result).toEqual([])
    })
  })

  describe('getTemplateById', () => {
    it('should return template by ID when it exists', async () => {
      const template = mockTemplates[0]
      mockRepository.findById.mockResolvedValue(template)

      const result = await service.getTemplateById(template.id)

      expect(result).toEqual(template)
      expect(mockRepository.findById).toHaveBeenCalledWith(template.id)
    })

    it('should throw NotFoundException when template not found', async () => {
      mockRepository.findById.mockResolvedValue(null)

      await expect(service.getTemplateById('non-existent-id')).rejects.toThrow(NotFoundException)
      await expect(service.getTemplateById('non-existent-id')).rejects.toThrow(
        'Workflow template with ID non-existent-id not found'
      )
    })
  })

  describe('getTemplateByKey', () => {
    it('should return template by key when it exists', async () => {
      const template = mockTemplates[0]
      mockRepository.findByKey.mockResolvedValue(template)

      const result = await service.getTemplateByKey('feature')

      expect(result).toEqual(template)
      expect(mockRepository.findByKey).toHaveBeenCalledWith('feature')
    })

    it('should throw NotFoundException when template key not found', async () => {
      mockRepository.findByKey.mockResolvedValue(null)

      await expect(service.getTemplateByKey('non-existent-key')).rejects.toThrow(NotFoundException)
      await expect(service.getTemplateByKey('non-existent-key')).rejects.toThrow(
        'Workflow template with key non-existent-key not found'
      )
    })

    it('should find feature template by key', async () => {
      const featureTemplate = mockTemplates[0]
      mockRepository.findByKey.mockResolvedValue(featureTemplate)

      const result = await service.getTemplateByKey('feature')

      expect(result.key).toBe('feature')
    })

    it('should find hotfix template by key', async () => {
      const hotfixTemplate = mockTemplates[1]
      mockRepository.findByKey.mockResolvedValue(hotfixTemplate)

      const result = await service.getTemplateByKey('hotfix')

      expect(result.key).toBe('hotfix')
    })
  })

  describe('validateTemplate', () => {
    it('should return true for active template', async () => {
      mockRepository.isActive.mockResolvedValue(true)

      const result = await service.validateTemplate('template-1')

      expect(result).toBe(true)
      expect(mockRepository.isActive).toHaveBeenCalledWith('template-1')
    })

    it('should return false for inactive template', async () => {
      mockRepository.isActive.mockResolvedValue(false)

      const result = await service.validateTemplate('template-1')

      expect(result).toBe(false)
    })
  })
})
